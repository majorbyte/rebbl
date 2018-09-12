'use strict';
const db = require('../../../lib/LeagueService.js')
  , util = require('../../../lib/util.js')
  , rampup = require('../../../lib/Rampup.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});

router.get('/rampup', util.checkCache, async function(req, res){

  let standings = await rampup.getCoachScore();

  res.sendResponse(
    standings.sort(function (a, b) {
      if (a.points > b.points) {
        return -1
      }
      if (b.points > a.points) {
        return 1
      }
      if (a.tddiff > b.tddiff) {
        return -1
      }
      if (b.tddiff > a.tddiff) {
        return 1
      }
      if (a.loss > b.loss) {
        return 1
      }
      if (b.loss > a.loss) {
        return -1
      }
      return 0;
    })
  );


});

router.get('/stunty', util.checkCache, async function(req, res){

  let standings = await db.getStuntyStandings();

  res.sendResponse(
    standings.sort(function (a, b) {
      if (a.points > b.points) {
        return -1
      }
      if (b.points > a.points) {
        return 1
      }
      if (a.tddiff > b.tddiff) {
        return -1
      }
      if (b.tddiff > a.tddiff) {
        return 1
      }
      if (a.loss > b.loss) {
        return 1
      }
      if (b.loss > a.loss) {
        return -1
      }
      return 0;
    })
  );


});

router.get('/:league', util.checkCache, async function(req, res){
  let league = req.params.league;
  if (league.toLowerCase() !== "rebbll" && league.toLowerCase() !== "xscessively elfly league" ){
    league = new RegExp(`^REBBL[\\s-]+${league}`, 'i');
  } else {
    league = new RegExp(`^${league}`, 'i');
  }

  let standings = await db.getCoachScore(league,"Season 9",false);

  
  standings.map(d => {
    delete d.account
  });

  res.sendResponse(
    standings.sort(function (a, b) {
      if (a.competition > b.competition){
        return 1
      }
      if (b.competition > a.competition){
        return -1
      }
      if (a.points > b.points) {
        return -1
      }
      if (b.points > a.points) {
        return 1
      }
      if (a.tddiff > b.tddiff) {
        return -1
      }
      if (b.tddiff > a.tddiff) {
        return 1
      }
      if (a.loss > b.loss) {
        return 1
      }
      if (b.loss > a.loss) {
        return -1
      }
      return 0;
    })
  );


});

module.exports = router;