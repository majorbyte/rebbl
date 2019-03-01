'use strict';
const league = require('../../lib/LeagueService.js')
  , cripple = require('../../lib/crippleService.js')
  , maintenanceService = require('../../lib/MaintenanceService.js')
  , team = require('../../lib/teamservice.js')
  , signUp = require('../../lib/signupService.js')
  , express = require('express')
  , util = require('../../lib/util.js')
  , reddit = require("../../lib/RedditService.js")
  , router = express.Router();

router.get('/update/cripple', async function(req, res){
  if (req.query.verify === process.env['verifyToken']){
    cripple.getMatches();
  }
  res.redirect('/');
});

router.get('/update/cripple/calculate', async function(req, res){
  if (req.query.verify === process.env['verifyToken']){
    cripple.calculateStandings("REBBL Cripple Ladder");
  }
  res.redirect('/');
});


router.get('/updateleague/init', async function(req, res){
  if (req.query.verify === process.env['verifyToken']){
    maintenanceService.initRebblData(req.query.league, req.query.comp);
  }
  res.redirect('/');
});

router.get('/updateleague/admininit', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  if (req.query.league) league.maintenanceService(req.query.league, req.query.comp);
  res.redirect('/');
});


router.get('/updateleague', async function(req, res){
  //if (req.query.verify === process.env['verifyToken']){
    maintenanceService.getRebblData(req.query.league);
    reddit.check();
  //}
  res.redirect('/');
});

router.get('/updateteams', async function(req, res){
  //if (req.query.verify === process.env['verifyToken']){
    if (req.query.id) team.updateTeams(parseInt(req.query.id));
    else team.updateTeams(null,req.query.justteams);
  //}
  res.redirect('/');
});
/*
router.get('/updateteams/init', async function(req, res){
  //if (req.query.verify === process.env['verifyToken']){
   //await team.initTemas();
   //await team.fixPastPlayers();
   //await team.fixTeamStats();
   await team.quickFixPlayers();
  //}
  res.redirect('/');
});

router.get('/updateteams/test', async function(req, res){
  
  let match = await league.getMatchDetails('10004cb93f')

  await team.updateTeamsAfterMatch(match);
  //if (req.query.verify === process.env['verifyToken']){
  //}
  res.redirect('/');
});*/


router.get('/checksignups', async function(req, res){
  if (req.query.verify === process.env['verifyToken']){
    signUp.checkTeams({'teamExist':false});
    signUp.checkTeams({'teamExist':{ $exists: false }});
  }
  res.redirect('/');
});

module.exports = router;