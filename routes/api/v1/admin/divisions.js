"use strict";

const express = require("express")
  , api = require("../../../../lib/apiService.js")
  , cache = require("memory-cache")
  , cyanideService = require("../../../../lib/CyanideService.js")
  , dataService = require("../../../../lib/DataService").rebbl
  , maintenanceService = require("../../../../lib/MaintenanceService.js")
  , util = require("../../../../lib/util.js")
  , router = express.Router();



  router.get("/", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      let data = await dataService.getSchedules({season:"season 13", round:1, league:{$in:["REBBL - GMan","REBBL - Big O", "REBBL - REL"]}},{projection:{_id: 0,league:1, competition:1, competition_id:1}});
      let upstarts =  await dataService.getSchedules({season:"season 13", round:1, league:"ReBBRL Upstarts"},{projection:{_id: 0,league:1, competition:1, competition_id:1}});
      let minors =  await dataService.getSchedules({season:"season 8", round:1, league:"ReBBRL Minors League"},{projection:{_id: 0,league:1, competition:1, competition_id:1}});
      let college =  await dataService.getSchedules({season:"season 9", round:1, league:"ReBBRL College League"},{projection:{_id: 0,league:1, competition:1, competition_id:1}});
      let playoffs =  await dataService.getSchedules({season:"season 13", round:1, league:"ReBBL Playoffs",competition:{$in:['REBBL Challenger\'s Cup XII','REBBL Playoffs Season 13']}},{projection:{_id: 0,league:1, competition:1, competition_id:1}});

      data = data.concat(upstarts,minors,college,playoffs);

      let temp = [...new Set(data.map(x=> x.competition_id))];
      data = temp.map(x => data.find(d => d.competition_id === x));

      res.status(200).send(data);
    } catch(err){
      console.log(err); 
    }
  });

  router.get("/:competitionId", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      let contests = await dataService.getSchedules({competition_id: Number(req.params.competitionId), round:1});

      let data = [];
      contests.map(x => {
        if(x.opponents[0].team.name.toLowerCase().indexOf("[admin]")> -1 ) data.push({team:x.opponents[0].team.name, id:x.opponents[0].team.id })
        if(x.opponents[1].team.name.toLowerCase().indexOf("[admin]")> -1 ) data.push({team:x.opponents[1].team.name, id:x.opponents[1].team.id })
        if(x.opponents[0].coach.id === null ) data.push({team:x.opponents[0].team.name, id:x.opponents[0].team.id })
        if(x.opponents[1].coach.id === null ) data.push({team:x.opponents[1].team.name, id:x.opponents[1].team.id })
      })

      res.status(200).send(data);
    } catch(err){
      console.log(err);
    }
  });

  router.get("/refresh/:league/:competition", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{

      maintenanceService.initRebblData(req.params.league, req.params.competition)

      res.status(200).send();
    } catch(err){
      console.log(err);
    }
  });
  
  router.get("/unplayed/:league", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      let cacheKey = `admin.competitions.${req.params.league}`;
      let competitions = cache.get(cacheKey);
      if(!competitions){
        let search = {platform:"pc", league:req.params.league};
       
        let data = await cyanideService.competitions(search);
        competitions = data.competitions;
        if (req.params.league === "ReBBL Playoffs"){
          //search.competition = 
          competitions = competitions.filter(x => ["REBBL Challenger's Cup XII","REBBL Playoffs Season 13"].indexOf(x.name)>-1);
        } cache.put(cacheKey, competitions,10*60*1000);
      }

      let round = competitions[0].round ;
      
      let data = await dataService.getSchedules({league:req.params.league, status:"scheduled", round:{$lte:round}});

      res.status(200).send(data);
    } catch(err){
      console.log(err);
    }
  });

  router.delete("/:competitionId/:teamId", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      let result = await api.expel(Number(req.params.competitionId), Number(req.params.teamId));

      res.status(200).send(result);
    } catch(err){
      console.log(err);
    }
  });



module.exports = router;