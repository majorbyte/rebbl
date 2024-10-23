'use strict';

const express = require('express')
, accountService = require('../../../lib/accountService.js')
, clanService = require('../../../lib/ClanService.js')
, clanValidationService = require('../../../lib/ClanValidationServiceBB3.js')
, rateLimit = require('express-rate-limit')
, util = require('../../../lib/util.js');


class ClanBuildingApi{
  constructor(){
    this.router =express.Router();
  }

  team(){
    return {
      roster:[],
      name:''
    }
  };
  
  async _getCoach(req,res){
    const account = await accountService.searchAccount({bb3coach:new RegExp(`^${req.query.coach.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,'i')});
    if (!account) res.status(404).json('coach not found');
    else res.json({reddit: account.reddit, coach:account.bb3coach, discord:account.discord});
  }

  async _getMe(req,res){
    const account = await accountService.getAccount(req.user.name);
    let oldClan = await clanService.getClanByUser(account.bb3coach);
    let newClan = await clanService.getNewClanByUser(account.bb3coach);

    res.json({
      coach:account.bb3coach,
      reddit:account.reddit,
      isClanLeader: account.roles?.includes('clanleader'),
      oldClan: oldClan?.name,
      newClan: newClan?.name
    })

  }

  async _getTeam(req,res){
    const clan = await clanService.getClanByName(req.params.clan);
    if (!clan) res.json(this.team());

    const team = clan.ledger.teamBuilding.find(x => x.name === req.params.team);
    res.json(team || this.team());
  }

  async _getReturningTeam(req,res){
    const team = await clanService.getCoachLastSeasonTeam(req.query.coach);
    if (team) res.json({name:team.team.name, id:team.team.id, raceId:team.team.idraces});
    res.status(404).send();
  }

  async _getReturningTeamPlayers(req,res){
    const players = await clanService.getReturningTeamPlayers(req.params.teamId);
    res.json(players);
  }

  async _getClan(req,res){
    const account = await accountService.getAccount(req.user.name);
    let clan = await clanService.getNewClanByUser(account.bb3coach);
    res.json(clan);
  }
  async _getClanByName(req,res){
    let clan = await clanService.getNewClanByName(req.params.clan);
    res.json(clan);
  }

  _validateClan = async (req,res) => res.json(await clanValidationService.validate(req.params.clan));

  async _lockClan(req,res){
    const validation = await clanValidationService.validate(req.params.clan);
    
    const errorCount = validation.sppTradeErrors.length + validation.sppTradeSkillErrors.length + validation.sppTradeAccounting.length
      + validation.incompleteTeamErrors.length + validation.freshTeamErrors.length + validation.returningTeamErros.length
      + validation.clanErrors.length + validation.cheatingErrors.length + validation.teamErrors.length;

    if (errorCount > 0 || validation.ex) res.status(400).json(validation);
    else {
      clanService.lockClan(req.params.clan);
      res.sendStatus(200);
    }
  }

  async _registerClan(req,res){
    const account = await accountService.getAccount(req.user.name);
    let clan = await clanService.getNewClanByUser(account.bb3coach);
    
    if (!clan){
      if (!/^[A-Z|0-9]+$/.test(req.params.clan)){
        return res.status(400).json({error:"invalid clan name"});
      }
  
      clan = clanService.createClan(req.params.clan, {
        coach: account.bb3coach,
        coachId: account.bb3coachId || 0,
        reddit: account.reddit,
        discord: account.discord
      });
    }
    res.json(clan);
  }

  async _saveMembers(req,res){
    clanService.updateMembers(req.body, res.locals.clan);
    res.sendStatus(200);
  }

  async _saveTeam(req,res){
    clanService.updateTeam(Number(req.params.team), req.body,true, res.locals.clan);
    res.sendStatus(200);
  }

  async _saveTeamSkill(req,res){
    clanService.updateTeam(Number(req.params.team), req.body,false, res.locals.clan);
    res.sendStatus(200);
  }

  async _saveClan(req,res){
    clanService.updateClan(req.body, res.locals.clan);
    res.sendStatus(200);
  }

  async _skillPlayer(req,res){
    try{
      const player = await clanService.skillPlayer(res.locals.clan.name, Number(req.params.team), req.body);
      res.json(player);
    } catch (ex) {
      res.status(400).send({error: ex.message});
    }
  }

  async _validateNewBlood(req,res){
    try{
      const validationResult = await clanValidationService.validateNewBlood(req.params.clan,req.params.team,req.body);
      if (validationResult.length > 0) res.status(400).send(validationResult);
      else res.status(200).send();
    } catch (ex) {
      res.status(500).send({error: ex.message});
    }
  }

  async _newBlood(req,res){
    try{
      const validationResult = await clanValidationService.validateNewBlood(req.params.clan,req.params.team,req.body);
      if (validationResult.length > 0) res.status(400).send(validationResult);
      else {
        await clanService.newBloodClanLeader(req.params.clan,req.params.team,req.body.name);
        res.status(200).send();
      }
    } catch (ex) {
      res.status(500).send({error: ex.message});
    }
  }

  async teamSaveAllowed(req, res, next) {
    const account = await accountService.getAccount(req.user.name);
    //const clan = await clanService.getNewClanByUser(account.coach);
    const clan = req.params.clan ? await clanService.getClanByNameAndSeason(req.params.clan, "season 19") :  await clanService.getNewClanByUser(account.bb3coach);

    if(!clan) return res.status(404).send({error:'Clan not found'});
    if(clan.locked) return res.status(400).send({error:'No more updates allowed'});
    res.locals.clan = clan;
    res.locals.account = account;

    const isMember = clan.leader === account.bb3coach || clan.members?.some(x => x.coach === account.bb3coach);

    if (!isMember) return res.status(403).send({error: 'You are not allowed to make changes to this team'});

    const isClanLeader = clan.leader === account.bb3coach;

    if (isClanLeader) return next();

    const team = clan.ledger.teamBuilding.find(team => team.id === Number(req.params.team));

    if (!team) return res.status(404).send({error: 'Team Id not found'});
    if (!team.coach || team.coach !== account.bb3coach) return res.status(403).send({error: 'You are not allowed to make changes to this team'});

    if (account.bb3coach.toLowerCase() !== req.body.coach.toLowerCase()) return res.status(403).send({error: 'You are not allowed to make changes to this team'});

    return next();
  };

  async isClanLeader(req, res, next) {
    const account = await accountService.getAccount(req.user.name);
    
    const clan = req.params.clan ? await clanService.getClanByName(req.params.clan) :  await clanService.getNewClanByUser(account.bb3coach); 

    if(!clan) return res.status(404).send({error:'Clan not found'});
    //if(clan.locked) return res.status(400).send({error:'No more updates allowed'});

    const isClanLeader = clan.leader === account.bb3coach;

    if (!isClanLeader) return res.status(403).send({error: 'You are not allowed to make changes to this team'});

    res.locals.clan = clan;
    res.locals.account = account;

    return next();
  };

  ensureAuthenticated = function (req, res, next) {
    try{
      if (res.locals.user) { return next(); }
      req.session.returnUrl = '/clan/clan';
      if (req.isAuthenticated()){
        res.redirect("/account/create");
      } else {
        res.redirect("/account/login");
      }
    }
    catch(ex){
      console.log(ex.message);
      console.log(ex.stack);
    }
  };

  routesConfig(){
    const apiRateLimiter = rateLimit({
      windowMs: 30 * 1000,
      max: 5, 
      message:
        'Too many requests, please wait 30 seconds',
      keyGenerator: function(req){
        return `${req.ip}+${req.user.name}+clan_coach`;
      }
    });


    this.router.get('/me',this.ensureAuthenticated ,  this._getMe.bind(this));
    this.router.get('/coach/team',this.ensureAuthenticated , util.cache(60*10)/*apiRateLimiter*/, this._getReturningTeam.bind(this));
    this.router.get('/coach/',this.ensureAuthenticated ,  this._getCoach.bind(this));
    this.router.get('/team/:teamId/players',this.ensureAuthenticated ,  this._getReturningTeamPlayers.bind(this));
    this.router.get('/:clan/validate', this._validateClan.bind(this));
    this.router.get('/:clan/lock', this.isClanLeader, this._lockClan.bind(this));
    this.router.get('/:clan/:team', this.ensureAuthenticated ,  this._getTeam.bind(this));
    this.router.get('/:clan', util.hasRole("clanadmin"), this._getClanByName.bind(this));
    this.router.get('/', this.ensureAuthenticated, this._getClan.bind(this)); 

    this.router.post('/:clan', util.hasRole('clanleader'), this._registerClan.bind(this));
    this.router.post('/:clan/:team/newblood/validate', this.isClanLeader, this._validateNewBlood.bind(this));
    this.router.post('/:clan/:team/newblood', this.isClanLeader, this._newBlood.bind(this));
    this.router.post('/:clan/:team/skill', this.isClanLeader, this._skillPlayer.bind(this));


    this.router.put('/:clan/members', this.isClanLeader, this._saveMembers.bind(this));
    this.router.put('/:clan/:team/skill', this.teamSaveAllowed, this._saveTeamSkill.bind(this));
    this.router.put('/:clan/:team', this.teamSaveAllowed, this._saveTeam.bind(this));
    this.router.put('/:clan', this.isClanLeader, this._saveClan.bind(this));


    return this.router;
  }

}  

module.exports = ClanBuildingApi;