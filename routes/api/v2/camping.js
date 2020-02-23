'use strict';
const dataService = require("../../../lib/DataService.js").cripple
  , express = require('express')
  , util = require('../../../lib/util.js');

class CampingApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }

  routesConfig(){
    this.router.get('/', util.cache(10*60), async function(req, res){
      res.json(await dataService.getStandings({competition:"REBBL Winter Camp"}));
    });


    return this.router;
  }
}

module.exports = CampingApi;