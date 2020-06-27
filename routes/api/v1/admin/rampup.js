'use strict';

const express = require('express')
  , rampupService = require("../../../../lib/Rampup.js")
  , util = require('../../../../lib/util.js')
  , router = express.Router();



  router.get('/', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
        const data = await rampupService.getAvailableRampupCoaches();
        res.status(200).send(data);
    } catch(err){
      console.log(err);
    }
  });
  
  router.post('/', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
        
        for(let matchup of req.body)
          await createMatchup(matchup);


        res.status(200).send("All matchups successfully created.");
    } catch(err){
      console.log(err);
      res.status(500).send("Something went wrong, check ingame for which comps were not created");
    }
  });

  const createMatchup = async function(matchup){
    if (Object.keys(matchup.home).length === 0 || Object.keys(matchup.away).length === 0) return;

    await rampupService.createMatchup(matchup.league === "GMAN", [matchup.home, matchup.away], matchup.competitionName);
  };


module.exports = router;