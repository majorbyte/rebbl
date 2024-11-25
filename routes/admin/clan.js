"use strict";

const express = require("express")
  , clanService = require("../../lib/ClanService.js")
  , dataService = require("../../lib/DataService.js").rebbl
  , util = require("../../lib/util.js")
  , router = express.Router();


router.get("/", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req, res){
  try{
    res.render("admin/clan/index");
  } catch(err){
    console.log(err);
  }
});

router.put("/clean", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req, res){
  try{
    await clanService.getContestData(true);
    return res.json();
  }catch(e){
    console.error(e);
    return res.status(500).json(e);
  }
});

router.get("/schedule", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req, res){
  try{
    res.render("admin/clan/schedule");
  } catch(err){
    console.log(err);
  }
});

router.post("/schedule", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req, res){
  try{

    const schedules = await dataService.getSchedules({league:"clan",season:"season 19", round:Number(req.body.round)});
    
    if (schedules.length > 0) {
      res.status(400).json({error: "Schedules already exist for this round"});
      return;
    }

    const parseSchedules = async function(div,name, round){
      for(let house=0; house < div.length; house++){

        let home = div[house].home;
        let away = div[house].away;
        let schedule = {
          league:"clan", 
          competition:name, 
          house:house+1,
          round:round,
          season:"season 19", 
          home:{clan:home, win:0, draw:0,loss:0},
          away:{clan:away, win:0, draw:0,loss:0},
          matches:[]};
          dataService.insertSchedule(schedule);
      }
    }

    await parseSchedules(req.body.schedules,"Division 1", Number(req.body.round));


    res.status(200).json({});
  } catch(err){
    console.log(err);
    res.status(400).json({error:err.message});
  }
});

module.exports = router;