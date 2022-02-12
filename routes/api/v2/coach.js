'use strict';
const dataService = require("../../../lib/DataService.js").rebbl
  , express = require('express')
  , util = require('../../../lib/util.js');

class CoachApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }

  routesConfig(){
    this.router.get("/:id", util.cache(60), this._getCoachInfo.bind(this));

    this.router.get("/:coach/search", util.cache(60), this._searchCoachInfo.bind(this));

    return this.router;
  }


  async _getCoachInfo(req,res){
    if (isNaN(Number(req.params.id))){
      res.status(400).json({error: "Not a valid number"});
    } else {
      const schedule = await dataService.getSchedule({"opponents.coach.id" : Number(req.params.id)});
      if (schedule) {
        const coach = schedule.opponents.find(function(a){return a.coach.id === Number(req.params.id);}).coach;
        if (coach) {
          const retval = await this._search(coach.name);
          if (retval) res.json(retval);
          else res.status(404).json({error:"coach not found"});  
        } else {
          res.status(404).json({error:"coach not found"});  
        }
      } else {
        res.status(404).json({error:"coach not found"});  
      }
    }
  }
  async _searchCoachInfo(req,res){
    const data = await this._search(req.params.coach);
    if (data) res.json(data);
    else res.status(404).json({error:"coach not found"});
  }

  async _search(coachName){
    const account = await dataService.getAccount({"coach": {$regex: new RegExp(`^${coachName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,"i")}});

    if (account){
      return {
        name: account.coach,
        reddit:account.reddit, 
        discord: account.discord, 
        discordId: account.discordId,
        steam: account.steam, 
        timezone: account.timezone, 
        twitch: account.twitch
      };
    }

    return undefined;
  }


}

module.exports = CoachApi;