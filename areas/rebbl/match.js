'use strict';
const db = require('../../lib/LeagueService.js')
  , cache = require('memory-cache')
  , express = require('express')
  , router = express.Router();


const checkCache = function(req, res, next){
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


router.get('/:match_id', checkCache, async function(req, res, next){
  let data = await db.getMatchDetails(req.params.match_id);
  if (!data) return next('route');
  data['rounds'] = await db.rounds();

  res.render('rebbl/match/match', data);
});

module.exports = router;