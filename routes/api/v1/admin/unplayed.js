'use strict';

const express = require('express')
  , concedeMatchService = require("../../../../lib/concedeMatchService.js")
  , dataService = require("../../../../lib/DataServiceBB3.js").rebbl3
  , util = require('../../../../lib/util.js')
  , router = express.Router();



  router.get('/', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      

      let competitions = await dataService.getCompetitions({leagueId:"94f0d3aa-e9ba-11ee-a745-02000090a64f"});
      let data = [];
      for(const competition of competitions){
        const schedules = await dataService.getSchedules({competitionId:competition.id, $or:[{status:1},{status:2}]});
        schedules.forEach(x => x.competition = competition.name);
        for(const schedule of schedules.filter(x => x.status === 2)){
          const match = await dataService.getMatch({matchId:schedule.matchId});
          schedule.validatedBy = match.validatedBy;
          schedule.notValidatedBy = match.notValidatedBy;
        }
        data = data.concat(schedules);
      }

      res.status(200).send(data);
    } catch(err){
      console.log(err);
    }
  });


  router.post('/byeweek/:matchId/:winningTeamId', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      await concedeMatchService.concedeMatch(req.params.matchId, req.params.winningTeamId);
      res.status(200).send();
    } catch(err){
      console.log(err);
      res.status(500).send(err);
    }
  });
  
module.exports = router;