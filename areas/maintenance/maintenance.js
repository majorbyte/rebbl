'use strict';
const league = require('../../lib/leagueservice')
  , wcq = require('../../lib/dataservice')
  , cache = require('memory-cache')
  , express = require('express')
  , router = express.Router();


router.get('/cache', async function(req, res, next){
  res.send(cache.keys());
});


router.get('/update/:round', async function(req, res){
  if (req.query.verify === process.env['verifyToken']){
    let round = parseInt(req.params.round);
    if (!round) return next('route');

    wcq.getLeagueData(round);
    //await wcq.updateCoachScoringPoints(126587);
  }
  res.redirect('/wcq/coach');
});


router.get('/updateleague/init', async function(req, res){
  if (req.query.verify === process.env['verifyToken']){
    league.getRebblData();
  }
  res.redirect('/wcq/coach');
});


router.get('/updateleague/:round', async function(req, res){
  if (req.query.verify === process.env['verifyToken']){

    let round = parseInt(req.params.round);
    if (!round) return next('route');

    league.getRebblData(round);
  }
  res.redirect('/wcq/coach');
});


module.exports = router;