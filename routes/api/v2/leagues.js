
'use strict';
const dataService = require('../../../lib/DataService.js').rebbl
, express = require('express')
, util = require('../../../lib/util.js');

class LeagueApi{
  constructor(){
    this.router = express.Router({mergeParams: true})
  }
  routesConfig(){
    this.router.get("/",util.checkCache, async function(req,res,next){
      try {
        let leagues = await dataService.getLeague({});
        res.status(200).send(leagues);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });
    
    this.router.get('/:leagueId', util.checkCache, async function(req, res){
      try {
        let league = await dataService.getTeam({"id":Number(req.params.leagueId)});
        res.status(200).send(league);
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