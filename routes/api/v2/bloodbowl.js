'use strict';
const dataService = require("../../../lib/DataService.js").rebbl
  , express = require('express')
  , bloodbowlService = require("../../../lib/bloodbowlService.js")
  , util = require('../../../lib/util.js');

class BloodBowlApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
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
      let data = await dataService.getLegendayPlayers({});

      res.json(data);
    });
    this.router.get('/legendaryplayers/:id/lastMatch', util.checkCache, async function(req, res){
      let matches = await dataService.getMatches({"match.teams.roster.id":Number(req.params.id)},{sort:{"uuid":-1},limit:1});

      res.json(matches[0].uuid);
    });


    return this.router;
  }
}

module.exports = BloodBowlApi;