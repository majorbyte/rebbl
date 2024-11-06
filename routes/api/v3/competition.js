
'use strict';
const dataService = require('../../../lib/DataServiceBB3.js').rebbl3
, express = require('express')
, util = require('../../../lib/util.js');

class LeagueApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }
  routesConfig(){
    
    this.router.get("/", async function(req,res){
      try {
        return res.json(await dataService.getCompetitions({parentId:{$exists:0}, season:{$exists:1}}));
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });

    this.router.get('/:leagueId', util.cache(600), async function(req, res){
      try {
        let league = await dataService.competitions({"leagueId":req.params.leagueId});
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