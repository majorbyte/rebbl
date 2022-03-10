'use strict';

const express = require('express')
, accountService = require('../../../lib/accountService.js')
, clanService = require('../../../lib/ClanService.js')
, clanValidationService = require('../../../lib/ClanValidationService.js')
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
    const account = await accountService.searchAccount({coach:new RegExp(`^${req.query.coach}$`,'i')});
    if (!account) res.status(404).json('coach not found');
    else res.json({reddit: account.reddit, coach:account.coach, discord:account.discord});
  }

  async _getMe(req,res){
    const account = await accountService.getAccount(req.user.name);
    let oldClan = await clanService.getClanByUser(account.coach);
    let newClan = await clanService.getNewClanByUser(account.coach);

    res.json({
      coach:account.coach,
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
    let clan = await clanService.getNewClanByUser(account.coach);
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
    let clan = await clanService.getNewClanByUser(account.coach);
    
    if (!clan){
      if (!/^[A-Z|0-9]+$/.test(req.params.clan)){
        return res.status(400).json({error:"invalid clan name"});
      }
  
      clan = clanService.createClan(req.params.clan, {
        coach: account.coach,
        coachId: account.coachId || 0,
        reddit: account.reddit,
        discord: account.discord
      });
    }
    res.json(clan);
  }

  async _saveMembers(req,res){
    const account = res.locals.account;
    clanService.updateMembers(account.coach, req.body);
    res.sendStatus(200);
  }

  async _saveTeam(req,res){
    const account = res.locals.account;
    clanService.updateTeam(account.coach, Number(req.params.team), req.body,true);
    res.sendStatus(200);
  }

  async _saveTeamSkill(req,res){
    const account = res.locals.account;
    clanService.updateTeam(account.coach, Number(req.params.team), req.body,false);
    res.sendStatus(200);
  }

  async _saveClan(req,res){
    const account = res.locals.account;
    clanService.updateClan(account.coach, req.body);
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

  async teamSaveAllowed(req, res, next) {
    const account = await accountService.getAccount(req.user.name);
    const clan = await clanService.getNewClanByUser(account.coach);

    if(!clan) return res.status(404).send({error:'Clan not found'});
    if(clan.locked) return res.status(400).send({error:'No more updates allowed'});
    res.locals.clan = clan;
    res.locals.account = account;

    const isMember = clan.name === req.params.clan;

    if (!isMember) return res.status(403).send({error: 'You are not allowed to make changes to this team'});

    const isClanLeader = clan.leader === account.coach;

    if (isClanLeader) return next();

    const team = clan.ledger.teamBuilding.find(team => team.id === Number(req.params.team));

    if (!team) return res.status(404).send({error: 'Team Id not found'});
    if (!team.coach || team.coach !== account.coach) return res.status(403).send({error: 'You are not allowed to make changes to this team'});

    if (account.coach.toLowerCase() !== req.body.coach.toLowerCase()) return res.status(403).send({error: 'You are not allowed to make changes to this team'});

    return next();
  };

  async isClanLeader(req, res, next) {
    const account = await accountService.getAccount(req.user.name);
    const clan = await clanService.getNewClanByUser(account.coach);

    if(!clan) return res.status(404).send({error:'Clan not found'});
    if(clan.locked) return res.status(400).send({error:'No more updates allowed'});

    const isClanLeader = clan.leader === account.coach;
    res.locals.clan = clan;
    res.locals.account = account;

    if (isClanLeader) return next();

    return res.status(403).send({error: 'You are not allowed to make changes to this team'});
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
    this.router.post('/:clan/:team/skill', this.isClanLeader, this._skillPlayer.bind(this));

    this.router.put('/:clan/members', this.isClanLeader, this._saveMembers.bind(this));
    this.router.put('/:clan/:team/skill', this.teamSaveAllowed, this._saveTeamSkill.bind(this));
    this.router.put('/:clan/:team', this.teamSaveAllowed, this._saveTeam.bind(this));
    this.router.put('/:clan', this.isClanLeader, this._saveClan.bind(this));


    return this.router;
  }

}  

module.exports = ClanBuildingApi;