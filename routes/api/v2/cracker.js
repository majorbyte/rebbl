'use strict';
const accountService = require('../../../lib/accountService.js')
  , crackerService = require("../../../lib/ChristmasCracker.js")
  , dataService = require("../../../lib/DataService.js").cripple
  , express = require('express')
  , util = require('../../../lib/util.js');

class CrackerApi{
  constructor(){
    this.router = express.Router({mergeParams: true})
  }

  routesConfig(){
    this.router.get("/", util.ensureAuthenticated, this._getCoachInfo);

    this.router.post("/register/:teamName", util.ensureAuthenticated,this._registerTeam);

    this.router.get("/packs", util.ensureAuthenticated, this._getPacks);
    this.router.get("/rebuild", util.ensureAuthenticated, this._rebuild);

    return this.router;
  }


  async _getCoachInfo(req,res){
    const account = await accountService.getAccount(req.user.name);
    const regex = new RegExp(`^${account.coach}$`,"i");

    let coach = await dataService.getStandings({league:/rebbl off season/i, competition:/REBBL's Christmas Cracker/i, name:{$regex:regex}});

    if (coach.length > 0)  {
      let ret = coach[0];
      delete ret.touchdowns;
      delete ret.casualties;
      delete ret.kills;
      delete ret.completions;
      delete ret.surfs;
      delete ret.levels;
      delete ret.matchesPlayed;
      delete ret.streak;
      delete ret.bigGuyTouchdowns;
      delete ret.weapons;
      delete ret.armourBreaks;
      delete ret.matchesLost;
      res.status(200).json(ret);
    } else res.status(404).json({error:"not registered yet"});
  }

  async _registerTeam(req,res){
    const account = await accountService.getAccount(req.user.name);

    let result = await crackerService.registerTeam(account.coach, req.params.teamName);

    res.status(200).send(result);
  }

  async _getPacks(req,res){
    const account = await accountService.getAccount(req.user.name);
    let result = await crackerService.getPacks(account.coach);
    res.status(200).send(result.map(x => x.cracker_template));
  }
  async _rebuild(req,res){
    const account = await accountService.getAccount(req.user.name);
    let result = await crackerService.claimPacks(account.coach);
    res.status(200).send(result.map(x => x.cracker_template));
  }
}

module.exports = CrackerApi;