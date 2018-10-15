'use strict';
const db = require('../../lib/LeagueService.js')
  , util = require('../../lib/util.js')
  , datingService = require("../../lib/DatingService.js")
  , express = require('express')
  , router = express.Router({mergeParams: true});

router.get('/', util.checkCache, async function(req,res) {
  let data = {matches: null, divisions: null, league: req.params.league, competition: req.params.division};
  
  let leagueRegex;
  let league = req.params.league;
  if(league.toLowerCase() == "open invitational"){
    leagueRegex = new RegExp(`^ReBBL Open Invitational`, 'i');
  } else if (league.toLowerCase() !== "greenhorn cup" && league.toLowerCase() !== "rebbll" && league.toLowerCase() !== "xscessively elfly league" ){
    leagueRegex = new RegExp(`REBBL[\\s-]+${req.params.league}`, 'i');
  } else {
    leagueRegex = new RegExp(`^${req.params.league}`, 'i');
  }
  let divRegex = new RegExp(`^${req.params.division}$`, 'i');
  
  if( req.params.league.toLowerCase() === "rampup"){
    leagueRegex = new RegExp(`${league}$`, 'i');
    divRegex = new RegExp(`^${req.params.division}`, 'i');
  }

  data.matches = await db.getLeagues({league: {"$regex": leagueRegex}, competition: {"$regex": divRegex}});

  let ids = []
  for(var prop in data.matches){
    data.matches[prop].map(m => ids.push(m.contest_id));
  }

  data.dates = await datingService.search({"id":{$in:ids}})

  data.divisions = await db.getDivisions(leagueRegex);

  if(league.toLowerCase() === "xscessively elfly league"){
    data.matches["1"] = await data.matches["1"].sort(function(a,b){
      return a.match_id > b.match_id ? -1 : 1 ;
    })
  }

  res.render('rebbl/division/index', data);
});

router.get('/:week', util.checkCache, async function(req,res) {
  let week = parseInt(req.params.week);

  if (week > 0){
    let data = {matches:null, divisions:null, league:req.params.league, competition: req.params.division, week: week };
    let leagueRegex;
    let league = req.params.league;
    if(league.toLowerCase() == "open invitational"){
      leagueRegex = new RegExp(`^ReBBL Open Invitational`, 'i');
    } else if (league.toLowerCase() !== "greenhorn cup" && league.toLowerCase() !== "rebbll" && league.toLowerCase() !== "xscessively elfly league" ){
      leagueRegex = new RegExp(`REBBL[\\s-]+${req.params.league}`, 'i');
    } else {
      leagueRegex = new RegExp(`^${req.params.league}`, 'i');
    }
      let divRegex = new RegExp(`^${req.params.division}$`, 'i');
    data.matches = await db.getLeagues({round: week, league: {"$regex": leagueRegex}, competition: {"$regex": divRegex}});

    if(league.toLowerCase() === "xscessively elfly league"){
      data.matches["1"] = await data.matches["1"].sort(function(a,b){
        return a.match_id > b.match_id ? -1 : 1 ;
      })
    }

    let ids = []
    data.matches.map(m => ids.push(m.contest_id));
  
    data.dates = await datingService.search({"id":{$in:ids}})
  

    data.divisions = await db.getDivisions(leagueRegex);
    data.weeks = await db.getWeeks(leagueRegex, divRegex);

    res.render('rebbl/division/round', data);
  } else {
    res.redirect(`/rebbl/${req.params.league}`);
  }
});

module.exports = router;