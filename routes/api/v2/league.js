
'use strict';
const dataService = require('../../../lib/DataService.js').rebbl
, configurationService = require("../../../lib/ConfigurationService.js")
, express = require('express')
, util = require('../../../lib/util.js');

class LeagueApi{
  constructor(){
    this.router = express.Router({mergeParams: true})
  }
  routesConfig(){
    
    this.router.get("/",util.checkCache, async function(req,res,next){
      try {
        let data = configurationService.getLeagues();
        res.json(data);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });

    this.router.get("/:league/seasons",util.checkCache, async function(req,res){
      try {
        res.json(configurationService.getAvailableSeasons(req.params.league));
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });




    this.router.get('/:leagueId', util.checkCache, async function(req, res){
      try {
        let league = await dataService.getLeagues({"id":Number(req.params.leagueId)});
        res.json(league);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });  
    return this.router;
  }
}  






module.exports = LeagueApi;