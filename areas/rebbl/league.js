'use strict';
const db = require('../../lib/LeagueService.js')
  , configuration = require('../../lib/ConfigurationService.js')
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});

router.get('/', util.checkCache, async function(req, res){
  let data = {standings:null, rounds:null, league:req.params.league };
  data.standings = await db.getCoachScore("REBBL - " + req.params.league, true);
  data.rounds = await db.getDivisions("REBBL - " + req.params.league);

  data.cutoffs = configuration.getPlayoffTickets(req.params.league);
  console.dir(data);
  res.render('rebbl/league/index', data);
});

module.exports = router;