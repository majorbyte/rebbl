'use strict';
const db = require('../../lib/leagueservice')
  , cache = require('memory-cache')
  , express = require('express')
  , router = express.Router({mergeParams: true});


const cacheCheck = function(req, res, next){
  let key = req.originalUrl || req.url;
  let cachedBody = cache.get(key);
  if (cachedBody) {
    res.send(cachedBody);
  } else {
    res.sendResponse = res.send;
    res.send = (body) => {
      cache.put(key, body);
      res.sendResponse(body);
    };
    next();
  }
};

router.get('/', cacheCheck, async function(req,res,next) {
  let data = {matches: null, divisions: null, league: req.params.league, competition: req.params.division};
  data.matches = await db.getLeagues({league: "REBBL - " + req.params.league, competition: req.params.division});
  data.divisions = await db.getDivisions("REBBL - " + req.params.league);

  res.render('rebbl/division/index', data);
});

router.get('/:week', cacheCheck, async function(req,res,next) {
  let week = parseInt(req.params.week);

  if (week > 0){
    let data = {matches:null, divisions:null, league:req.params.league, competition: req.params.division, week: week };
    data.matches = await db.getLeagues({round: week, league: "REBBL - " + req.params.league, competition: req.params.division});
    data.divisions = await db.getDivisions("REBBL - " + req.params.league);
    data.weeks = await db.getWeeks("REBBL - " + req.params.league, req.params.division);

    res.render('rebbl/division/round', data);
  } else {
    res.redirect(`/rebbl/${req.params.league}`);
  }
});

module.exports = router;