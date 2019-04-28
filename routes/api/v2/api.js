'use strict';

const express = require('express')
  /* Endpoints */
  , bloodbowlApi = require("./bloodbowl.js")
  , leagueApi = require("./league.js")
  , standingsApi = require("./standings.js")
  , teamApi = require("./team.js");

class ApiV2{
  constructor(){
    this.router =express.Router()
  }

  routesConfig(){

    this.router.use('/bloodbowl', new bloodbowlApi().routesConfig());

    this.router.use('/standings', new standingsApi().routesConfig());

    this.router.use('/league', new leagueApi().routesConfig());
    
    this.router.use('/team', new teamApi().routesConfig());
    
    return this.router;
  }

}  

module.exports = ApiV2;