'use strict';
const   dataService = require("../../../lib/DataService.js").rebbl
  , express = require('express')
  , bloodbowlService = require("../../../lib/bloodbowlService.js")
  , util = require('../../../lib/util.js');

class BloodBowlApi{
  constructor(){
    this.router = express.Router({mergeParams: true})
  }

  routesConfig(){
    this.router.get('/skills', util.checkCache, async function(req, res){
      res.json(await bloodbowlService.getAllSkills());
    });

    this.router.get('/skillDescriptions', util.checkCache, async function(req, res){
      res.json(await bloodbowlService.getSkillDescriptions());
    });

    this.router.get('/playertypes', util.checkCache, async function(req, res){
      let data = await dataService.getPlayerTypes({});
      res.json(data);
    });

    this.router.get('/playertypes/:race', util.checkCache, async function(req, res){
      let data = await dataService.getPlayerTypes({race:Number(req.params.race)});
      res.json(data);
    });

    
    this.router.get('/races', util.checkCache, async function(req, res){
      let data = await dataService.getRaces({});
      res.json(data);
    });
    
    this.router.get('/starplayers', util.checkCache, async function(req, res){
      let data = await dataService.getStarPlayers({});
      res.json(data);
    });
        
    this.router.get('/legendaryplayers', util.checkCache, async function(req, res){
      let data = await dataService.getPlayers({xp:{$gt:175}, xp_gain:{$gt:0}});

      for(var x = 0; x < data.length; x++){
        let player = data[x];
        let team = await dataService.getTeam({"team.id":player.teamId});
        if (team){
          player.teamName = team.team.name;
          player.teamLogo = team.team.logo;
          player.retiredTeam = Date.parse(team.team.datelastmatch) < new Date(Date.now() - 4*7*24*60*60*1000);
        } else {
          player.retiredTeam = true;
        }
      }

      res.json(data);
    });
    return this.router;
  }
}

module.exports = BloodBowlApi;