'use strict';
const db = require('../../lib/LeagueService.js')
  , teamService = require('../../lib/teamservice.js')
  , accountService = require("../../lib/accountService.js")
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router();

router.get('/:coach_id', util.checkCache, async function(req, res){
  res.redirect(`/rebbl/coach/${req.params.coach_id}/details`);
});

router.get('/:coach_id/teams', util.checkCache, async function(req, res){
  let data =  await db.getCoach(req.params.coach_id);
  if (data)
    data.teams = await teamService.getTeams(data.id);
  res.render('rebbl/coach/teams', data);
});

router.get('/:coach_id/matches', util.checkCache, async function(req, res){
  let data =  await db.getCoach(req.params.coach_id);
  if (data)
    data.matches = await db.getMatchesForCoach(data.id);
  res.render('rebbl/coach/matches', data);
});

router.get('/:coach_id/trophies', util.checkCache, async function(req, res){
  let data =  await db.getCoach(req.params.coach_id);
  if (data){
    data.coachDetails = await accountService.searchAccount({"coach": {$regex: new RegExp(`^${data.name}`,"i")}});
    data.renderExtra = true;
  }
  res.render('rebbl/coach/trophies', data);
});

router.get('/:coach_id/details', util.checkCache, async function(req, res){
  let data =  await db.getCoach(req.params.coach_id);
  if (data) {
    data.coachDetails = await accountService.searchAccount({"coach": {$regex: new RegExp(`^${data.name}$`,"i")}});
    if (!data.coachDetails)
      data.coachDetails = await accountService.searchAccount({"coach": {$regex: new RegExp(`^${data.name}`,"i")}});
    data.renderExtra = true;
  }
  else {
    data = {};
    data.coachDetails = await accountService.searchAccount({"coach": {$regex: new RegExp(`^${req.params.coach_id}$`,"i")}});
    if (!data.coachDetails)
      data.coachDetails = await accountService.searchAccount({"coach": {$regex: new RegExp(`^${req.params.coach_id}`,"i")}});

    data.renderExtra = false;
  }

  res.render('rebbl/coach/details', data);
});

module.exports = router;