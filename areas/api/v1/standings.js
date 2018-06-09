'use strict';
const db = require('../../../lib/LeagueService.js')
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

router.get('/:league', cacheCheck, async function(req, res, next){
  let standings = await db.getCoachScore("REBBL - " + req.params.league);


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
    })/*.reduce(function(rv, x) {
    (rv[x['competition']] = rv[x['competition']] || []).push(x);
    return rv;
  }, {})*/
  );


});

module.exports = router;