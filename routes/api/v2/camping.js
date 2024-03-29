'use strict';
const dataService = require("../../../lib/DataService.js").rebbl
  , express = require('express')
  , util = require('../../../lib/util.js');

class CampingApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }

  routesConfig(){
    this.router.get('/winter', util.cache(10*60), async function(req, res){
      res.json(await dataService.getStandings({competition:"REBBL Winter Camp",season:"season 4"}));
    });

    this.router.get('/summer', util.cache(10*60), async function(req, res){
      res.json(await dataService.getStandings({competition:"REBBL Summer Camp",season:"season 3"}));
    });


    return this.router;
  }
}

module.exports = CampingApi;