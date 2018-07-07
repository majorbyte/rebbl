'use strict';
const db = require('../../lib/LeagueService.js')
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});

router.get('/', util.checkCache, async function(req,res) {
  let data = {matches: null, divisions: null, league: req.params.league, competition: req.params.division};
  let leagueRegex = new RegExp(`REBBL - ${req.params.league}`, 'i');
  let divRegex = new RegExp(`${req.params.division}`, 'i');
  data.matches = await db.getLeagues({league: {"$regex": leagueRegex}, competition: {"$regex": divRegex}});
  data.divisions = await db.getDivisions("REBBL - " + req.params.league);

  res.render('rebbl/division/index', data);
});

router.get('/:week', util.checkCache, async function(req,res) {
  let week = parseInt(req.params.week);

  if (week > 0){
    let data = {matches:null, divisions:null, league:req.params.league, competition: req.params.division, week: week };
    let leagueRegex = new RegExp(`REBBL - ${req.params.league}`, 'i');
    let divRegex = new RegExp(`${req.params.division}`, 'i');
    data.matches = await db.getLeagues({round: week, league: {"$regex": leagueRegex}, competition: {"$regex": divRegex}});
    data.divisions = await db.getDivisions("REBBL - " + req.params.league);
    data.weeks = await db.getWeeks("REBBL - " + req.params.league, req.params.division);

    res.render('rebbl/division/round', data);
  } else {
    res.redirect(`/rebbl/${req.params.league}`);
  }
});

module.exports = router;