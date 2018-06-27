'use strict';
const league = require('../../lib/LeagueService.js')
  , wcq = require('../../lib/WorldCupQualifierService.js')
  , team = require('../../lib/TeamService.js')
  , signUp = require('../../lib/signupService.js')
  , express = require('express')
  , router = express.Router();

router.get('/update/:round', async function(req, res){
  if (req.query.verify === process.env['verifyToken']){
    let round = parseInt(req.params.round);
    if (!round) return next('route');

    wcq.getLeagueData(round);
  }
  res.redirect('/');
});


router.get('/updateleague/init', async function(req, res){
  if (req.query.verify === process.env['verifyToken']){
    league.getRebblData();
  }
  res.redirect('/');
});


router.get('/updateleague/:round', async function(req, res){
  if (req.query.verify === process.env['verifyToken']){

    let round = parseInt(req.params.round);
    if (!round) return next('route');

    league.getRebblData(round);
  }
  res.redirect('/');
});


router.get('/updateteams', async function(req, res){
  if (req.query.verify === process.env['verifyToken']){
    team.updateTeams();
  }
  res.redirect('/');
});

router.get('/checksignups', async function(req, res){
  if (req.query.verify === process.env['verifyToken']){
    signUp.checkTeams({'teamExist':false});
  }
  res.redirect('/');
});

module.exports = router;