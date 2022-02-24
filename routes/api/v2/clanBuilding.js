'use strict';

const express = require('express')
, accountService = require('../../../lib/accountService.js')
, clanService = require('../../../lib/ClanService.js')
, rateLimit = require('express-rate-limit')
, util = require('../../../lib/util.js');
const { getActiveClanSeason } = require('../../../lib/ConfigurationService.js');

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
    const account = await accountService.searchAccount({coach:new RegExp(`^${req.params.coach}$`,'i')});
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
      isClanLeader: account.roles.includes("clanleader"),
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
    const team = await clanService.getCoachLastSeasonTeam(req.params.coach);
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

  async _registerClan(req,res){
    const account = await accountService.getAccount(req.user.name);
    const clan = clanService.createClan(req.params.clan, {
      coach: account.coach,
      coachId: account.coachId || 0,
      reddit: account.reddit,
      discord: account.discord
    });
    res.json(clan);
  }

  async _saveTeam(req,res){
    res.json({});
  }


  async teamSaveAllowed(req, res, next) {
    const account = await accountService.getAccount(req.user.name)
    return account.roles?.includes("clanleader") || account.coach.toLowerCase() === req.body.coach.toLowerCase() 
      ? next() 
      : res.status(403).send({error: "You are not allowed to make changes to this team"});
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

    this.router.get('/coach',util.ensureAuthenticated ,  this._getMe.bind(this));
    this.router.get('/coach/:coach/team',util.ensureAuthenticated , apiRateLimiter, this._getReturningTeam.bind(this));
    this.router.get('/coach/:coach',util.ensureAuthenticated ,  this._getCoach.bind(this));
    this.router.get('/team/:teamId/players',util.ensureAuthenticated ,  this._getReturningTeamPlayers.bind(this));
    this.router.get('/:clan/:team',util.ensureAuthenticated ,  this._getTeam.bind(this));
    this.router.get('/', this._getClan.bind(this));

    this.router.post('/:clan', util.hasRole("clanleader"), this._registerClan.bind(this));

    this.router.put('/:clan/team', this.teamSaveAllowed, this._saveTeam.bind(this));


    return this.router;
  }

}  

module.exports = ClanBuildingApi;