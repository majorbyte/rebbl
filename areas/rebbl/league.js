'use strict';
const db = require('../../lib/LeagueService.js')
  , configuration = require('../../lib/ConfigurationService.js')
  , rampup = require("../../lib/Rampup.js")
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});

router.get('/', util.checkCache, async function(req, res){
  let data = {standings:null, rounds:null, league:req.params.league };

  let league = req.params.league;

  if(league.toLowerCase() == "open invitational"){
    league = new RegExp(`^ReBBL Open Invitational`, 'i');
  } else if (league.toLowerCase() !== "greenhorn cup" && league.toLowerCase() !== "rebbll" && league.toLowerCase() !== "xscessively elfly league" && league.toLowerCase() !== "rabble" ){
    league = new RegExp(`^REBBL[\\s-]+${league}`, 'i');
  }  
  else {
    if (league === "rabble"){
      league = "the rebbl rabble mixer";
    }
    league = new RegExp(`^${league}`, 'i');
  }

  data.cutoffs = configuration.getPlayoffTickets(req.params.league);
  
  if( req.params.league.toLowerCase() === "rampup"){
    data.standings = await rampup.getCoachScore();
    data.rounds = await db.getDivisions(new RegExp(/rampup$/,"i"));
    res.render('rebbl/league/rampup', data);
  } else {
    data.standings = await db.getCoachScore(league, null, true);
    data.rounds = await db.getDivisions(league);
    res.render('rebbl/league/index', data);
  }

});

module.exports = router;