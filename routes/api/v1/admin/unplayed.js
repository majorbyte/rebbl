'use strict';

const express = require('express')
  , adminMatchService = require("../../../../lib/adminMatchService.js")
  , dataService = require("../../../../lib/DataServiceBB3.js").rebbl3
  , util = require('../../../../lib/util.js')
  , router = express.Router();



  router.get('/', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      

      let competitions = await dataService.getCompetitions({leagueId:"94f0d3aa-e9ba-11ee-a745-02000090a64f",season:"season 2"});
      let data = [];
      for(const competition of competitions){
        const schedules = await dataService.getSchedules({competitionId:competition.id, $or:[{status:1},{status:2}]});
        schedules.forEach(x => x.competition = competition.name);
        for(const schedule of schedules.filter(x => x.status === 2)){
          const match = await dataService.getMatch({matchId:schedule.matchId});
          if (!match) continue;
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


  router.post('/admin/:matchId', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      switch(req.body.type){
        case "byeweek" :
          await adminMatchService.concedeMatch(req.params.matchId, req.body.teamId);
          break;
        case "validDraw" :
          await adminMatchService.adminDrawMatch(req.param.matchId, false);
          break;
        case "invalidDraw" :
          await adminMatchService.adminDrawMatch(req.param.matchId, true);
          break;
        default:
          await adminMatchService.adminMatch(req.params.matchId, req.body.teamId, req.body.type);
          break;
      }

      res.status(200).send();
    } catch(err){
      console.log(err);
      res.status(500).send(err);
    }
  });

  router.post('/reset/:matchId', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      await adminMatchService.resetMatch(req.params.matchId);
      res.status(200).send();
    } catch(err){
      console.log(err);
      res.status(500).send(err);
    }
  });
  
module.exports = router;