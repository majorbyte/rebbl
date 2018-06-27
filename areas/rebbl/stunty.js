'use strict';
const db = require('../../lib/LeagueService.js')
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});


router.get('/', util.checkCache, async function(req, res){
  let data = {standings:null, rounds:null, league:req.params.league || 'GMan' };
  data.standings = await db.getStuntyStandings();
  data.rounds = await db.getDivisions("REBBL - " + (req.params.league || 'GMan') );

  res.render('rebbl/stunty/index', data);
});

module.exports = router;