'use strict';
const db = require('../../lib/teamservice')
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

router.get('/:team_id', checkCache, async function(req, res, next){
  let data =  await db.getTeam(req.params.team_id);

  res.sendResponse(data);
});

module.exports = router;