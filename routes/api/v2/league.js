
'use strict';
const dataService = require('../../../lib/DataService.js').rebbl
, configurationService = require("../../../lib/ConfigurationService.js")
, express = require('express')
, util = require('../../../lib/util.js');

class LeagueApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }
  routesConfig(){
    
    this.router.get("/",util.cache(600), async function(req,res){
      try {
        let data = configurationService.getLeagues();
        res.json(data);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });

    this.router.get("/:league/seasons",util.cache(600), async function(req,res){
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

        let param = {league:new RegExp(league,'i'),season:new RegExp(season,'i'),competition:/^(?!S13.*)/i}
        if (round !== "all") param.round = Number(round);

        let data = await dataService.getSchedules(param);
        let split = [];
        if (round > 8){
          param.round = Number(round)-8
          split = await dataService.getSchedules(param);
          split.map(x => x.round += 8);
        }
        data = data.concat(split);

        data = data.filter(d => d.opponents);

        let ret = data.map(m => {
          let division = m.competition;
          let match_uuid = m.match_uuid;
          let homeCoachId = m.opponents[0].coach.id;
          let homeCoachName = m.opponents[0].coach.name;
          let homeTeamId = m.opponents[0].team.id;
          let homeTeamName = m.opponents[0].team.name;
          let homeTeamRace = m.opponents[0].team.race;
          let homeScore = m.opponents[0].team.score;
          let awayCoachId = m.opponents[1].coach.id;
          let awayCoachName = m.opponents[1].coach.name;
          let awayTeamId = m.opponents[1].team.id;
          let awayTeamName = m.opponents[1].team.name;
          let awayTeamRace = m.opponents[1].team.race;
          let awayScore = m.opponents[1].team.score;
          let round = m.round;

          return {division, round, match_uuid, 
            homeCoachId, homeCoachName, homeTeamId, homeTeamName, homeTeamRace, homeScore, 
            awayCoachId, awayCoachName, awayTeamId, awayTeamName, awayTeamRace, awayScore };
        });

        res.json(ret.sort((a,b)=> a.division > b.division ? 1 : -1).sort((a,b) => b.round - a.round));
      }
      catch (ex){
        console.error(ex);
        res.status(500).json('{"error": "Something something error"}');
      }
    });  

    this.router.get('/:leagueId', util.cache(600), async function(req, res){
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