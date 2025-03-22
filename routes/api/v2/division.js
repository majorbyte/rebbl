
'use strict';
const dataService = require('../../../lib/DataService.js').rebbl
, express = require('express')
, util = require('../../../lib/util.js');

class DivisionApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }
  routesConfig(){
    
    this.router.get("/:league/:season", async function(req,res){
      try {

        let {league, season} = req.params;

        let data = await dataService.getSeason({league:league, season:season});
        res.json(data.divisions);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send({error:'Something something error'});
      }
    });

    this.router.get('/:league/:season/:division', async function(req, res){
      try {
        let {league,season, division} = req.params;

        let data = await dataService.getSchedules({league:new RegExp(league.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),'i'),season:season,competition:new RegExp(division,'i')});
        res.json(data);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send({error:'Something something error'});
      }
    });  

    this.router.get('/:league/:season/:division/slim', async function(req, res){
      try {
        let {league,season, division} = req.params;

        let data = await dataService.getSchedules({league:new RegExp(league.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")  ,'i'),season:season,competition:new RegExp(division,'i')});

        let ret = data.map(m => {
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

          return {round, match_uuid, 
            homeCoachId, homeCoachName, homeTeamId, homeTeamName, homeTeamRace, homeScore, 
            awayCoachId, awayCoachName, awayTeamId, awayTeamName, awayTeamRace, awayScore };
        });

        res.json(ret.sort((a,b)=> a.round > b.round ? 1 : -1));
      }
      catch (ex){
        console.error(ex);
        res.status(500).send({error:'Something something error'});
      }
    }); 

    this.router.get('/:league/:season/:division/:round',  async function(req, res){
      try {
        let {league,season, division, round} = req.params;

        let data = await dataService.getSchedules({league:league,season:season,competition:division, round:Number(round)});
        res.json(data);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send({error:'Something something error'});
      }
    });  

    this.router.get('/unsaved',async function(req,res){

      let now = new Date(Date.now());
      now.setHours(now.getHours() - 7*24);

      let data = await dataService.getMatches({uuid:{$gt:"1000857000"},"match.finished":{$gt: now.toJSON()}, saved:{$exists:0}},{projection:{"match.id":1, "match.idcompetition":1,"match.started":1,"match.finished":1, _id:0}});

      data = data.filter(x => x.match.started !== x.match.finished);

      res.json(data.map(x => {return {id: x.match.id, competitionId: x.match.idcompetition}; }));
    });

    this.router.post('/unsaved', util.verifyMaintenanceToken,async function(req,res){
      
      dataService.updateMatch({"match.id":Number(req.body.id)},{$set:{saved:true, filename:req.body.filename}});
      
      res.json({result:"success"});
    });


    return this.router;
  }


}  






module.exports = DivisionApi;