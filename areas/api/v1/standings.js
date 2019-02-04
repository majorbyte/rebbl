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


router.get('/csv/:league/:filter', util.ensureAuthenticated, util.hasRole("admin"), async function(req,res){


  let league = req.params.league;
  if (league.toLowerCase() !== "rebbll" && league.toLowerCase() !== "xscessively elfly league" ){
    league = new RegExp(`^REBBL[\\s-]+${league}`, 'i');
  } else {
    league = new RegExp(`^${league}`, 'i');
  }

  let standings = await db.getCoachScore(league,req.params.filter,false);

  standings =  standings.sort(function (a, b) {
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
  });


  const csv = standings.map(function(row){
    return `${JSON.stringify(row.competition || "")},${JSON.stringify(row.name)},${JSON.stringify(row.team)},${JSON.stringify(row.points)},${JSON.stringify(row.games)},${JSON.stringify(row.win)},${JSON.stringify(row.draw)},${JSON.stringify(row.loss)},${JSON.stringify(row.tddiff)}`;
  });

  csv.unshift('competition,coach,team,points,games,win,draw,loss,tddiff');

  res.setHeader("content-type", "text/csv");
  res.set('Content-Type', 'application/octet-stream');
  res.attachment(`${req.params.league}.csv`);
  res.status(200).send(csv.join('\r\n'));


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