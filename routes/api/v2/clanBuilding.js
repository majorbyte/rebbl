'use strict';

const express = require("express")
, accountService = require("../../../lib/accountService.js")
, clanService = require("../../../lib/ClanService.js")
, rateLimit = require("express-rate-limit")
, util = require('../../../lib/util.js')

class ClanBuildingApi{
  constructor(){
    this.router =express.Router();
  }


  team(){
    return {
      roster:[],
      name:""
    }
  };
  
  async _getCoach(req,res){
    const account = await accountService.searchAccount({coach:new RegExp(`^${req.params.coach}$`,'i')});
    if (!account) res.status(404).json("coach not found");
    else res.json(account.reddit);
  }

  async _getTeam(req,res){
    const clan = await clanService.getClanByName(req.params.clan);
    if (!clan) res.json(this.team());

    const team = clan.ledger.teamBuilding.find(x => x.name === req.params.team);
    res.json(team || this.team());
  }

  routesConfig(){
    const apiRateLimiter = rateLimit({
      windowMs: 30 * 1000,
      max: 2, 
      message:
        "Too many requests, please wait 30 seconds",
      keyGenerator: function(req){
        return `${req.ip}+${req.user.name}+clan_coach`;
      }
    });

    this.router.use("/coach/:coach",util.ensureAuthenticated , apiRateLimiter, this._getCoach.bind(this));

    this.router.use("/:clan/:team",util.ensureAuthenticated , apiRateLimiter, this._getTeam.bind(this));


    return this.router;
  }

}  

module.exports = ClanBuildingApi;