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
      
      let data = await dataService.getSchedules({season:"season 14", round:1, league:{$in:["REBBL - GMan","REBBL - Big O", "REBBL - REL","REBBL - REL 2","REBBL - GMan 2"]}},{projection:{_id: 0,league:1, competition:1, competition_id:1}});
      let upstarts = await dataService.getSchedules({season:"season 19", round:1, league:"ReBBRL Upstarts"},{projection:{_id: 0,league:1, competition:1, competition_id:1}});
      let minors = await dataService.getSchedules({season:"season 8", round:1, league:"ReBBRL Minors League"},{projection:{_id: 0,league:1, competition:1, competition_id:1}});
      let college = await dataService.getSchedules({season:"season 9", round:1, league:"ReBBRL College League"},{projection:{_id: 0,league:1, competition:1, competition_id:1}});
      let playoffs = await dataService.getSchedules({season:"season 14", round:1, league:"ReBBL Playoffs",competition:{$in:['Challenger\'s Cup XIV','REBBL Playoffs Season 14']}},{projection:{_id: 0,league:1, competition:1, competition_id:1}});

      data = data.concat(upstarts,minors,college,playoffs);

      let temp = [...new Set(data.map(x=> x.competition_id))];
      data = temp.map(x => data.find(d => d.competition_id === x));
      
      let id = [... new Set(data.map(x => x.competition_id))];

      let divisions = await dataService.getDivisions({competition_id:{$in:id}});
      divisions.map(d => {
        let division = data.find(x => x.competition_id === d.competition_id);
        if (division)
          division.admin = d.admin;
      });

      res.status(200).send(data);
    } catch(err){
      console.log(err); 
    }
  });

  router.get("/admins", util.ensureAuthenticated, async function(req, res){
    let users = await dataService.getAccounts({roles:"admin"});
    users = users.map(x => {return {coach: x.coach, reddit:x.reddit};}).sort((a,b) => a.coach.localeCompare(b.coach,undefined, {sensitivity:"base"}));
    res.status(200).send(users);
  });

  router.get("/:competitionId", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      let contests = await dataService.getSchedules({competition_id: Number(req.params.competitionId), round:1});

      let data = [];
      contests.map(x => {
        if(x.opponents[0].team.name.toLowerCase().indexOf("[admin]")> -1 ) data.push({team:x.opponents[0].team.name, id:x.opponents[0].team.id });
        if(x.opponents[1].team.name.toLowerCase().indexOf("[admin]")> -1 ) data.push({team:x.opponents[1].team.name, id:x.opponents[1].team.id });
        if(x.opponents[0].coach.id === null ) data.push({team:x.opponents[0].team.name, id:x.opponents[0].team.id });
        if(x.opponents[1].coach.id === null ) data.push({team:x.opponents[1].team.name, id:x.opponents[1].team.id });
      });

      res.status(200).send(data);
    } catch(err){
      console.log(err);
    }
  });

  router.get("/refresh/:league/:competition", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{

      maintenanceService.initRebblData(req.params.league, req.params.competition);

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
          competitions = competitions.filter(x => ["Challenger's Cup XIV","REBBL Playoffs Season 14"].indexOf(x.name)>-1);
        } cache.put(cacheKey, competitions,10*60*1000);
      }

      let round = competitions[0].round;
      
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

  router.put("/:competitionId/:admin", util.ensureAuthenticated, util.hasRole("admin"), async function(req,res){
    try{

      dataService.updateDivision(
        {competition_id: Number(req.params.competitionId)},
        {competition_id: Number(req.params.competitionId), admin:req.params.admin},
        {upsert:true});
      
      res.status(200).send("ok");
    } catch(err){
      console.log(err);
      res.status(500).send("oy vey");
    }

  });



module.exports = router;