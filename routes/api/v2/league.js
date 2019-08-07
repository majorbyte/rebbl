
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


    this.router.get('/:league/:season/slim/:round', util.cache(600), async function(req, res){
      try {
        let {league,season, round} = req.params;

        let data = await dataService.getSchedules({league:league,season:season,round:Number(round)});

        let ret = data.map(m => {
          let division = m.competition;
          let match_uuid = m.match_uuid;
          let homeTeam = m.opponents[0].team.name;
          let homeScore = m.opponents[0].team.score;
          let awayTeam = m.opponents[1].team.name;
          let awayScore = m.opponents[1].team.score;
          let round = m.round;

          return {division, round, match_uuid,homeTeam,homeScore,awayScore,awayTeam};
        })

        res.json(ret.sort((a,b)=> a.division > b.division ? 1 : -1));
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