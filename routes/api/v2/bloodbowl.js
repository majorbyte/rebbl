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
      res.json(bloodbowlService.getSkillDescriptions());
    });
    
    this.router.get('/playertypes/:race', util.checkCache, async function(req, res){
      let data = await dataService.getPlayerTypes({race:Number(req.params.race)});
      res.json(data);
    });
    
    this.router.get('/starplayers', util.checkCache, async function(req, res){
      let data = await dataService.getStarPlayers({});
      res.json(data);
    });
    
    return this.router;
  }
}

module.exports = BloodBowlApi;