'use strict';

const express = require('express')
  /* Endpoints */
  , bloodbowlApi = require("./bloodbowl.js")
  , clanApi = require("./clan.js")
  , divisionApi = require("./division.js") 
  , leagueApi = require("./league.js")
  , matchApi = require("./match.js")
  , standingsApi = require("./standings.js")
  , teamApi = require("./team.js")
  , trophiesApi = require("./trophies.js");

class ApiV2{
  constructor(){
    this.router =express.Router()
  }

  routesConfig(){

    this.router.use('/bloodbowl', new bloodbowlApi().routesConfig());
    
    this.router.use('/clan', new clanApi().routesConfig());

    this.router.use('/division', new divisionApi().routesConfig());

    this.router.use('/league', new leagueApi().routesConfig());

    this.router.use('/match', new matchApi().routesConfig());

    this.router.use('/standings', new standingsApi().routesConfig());
    
    this.router.use('/team', new teamApi().routesConfig());

    this.router.use('/trophies', new trophiesApi().routesConfig());

    return this.router;
  }

}  

module.exports = ApiV2;