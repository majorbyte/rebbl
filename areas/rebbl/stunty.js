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


router.get('/', cacheCheck, async function(req, res, next){
  let data = {standings:null, rounds:null, league:req.params.league || 'GMan' };
  data.standings = await db.getStuntyStandings();
  data.rounds = await db.getDivisions("REBBL - " + (req.params.league || 'GMan') );

  res.render('rebbl/stunty/index', data);
});

module.exports = router;