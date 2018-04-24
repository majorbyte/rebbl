'use strict';
const db = require('../../lib/dataservice')
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

router.get('/:round_id', checkCache, async function(req, res, next){
  var id = req.params.round_id;
  if (!id) return next('route');

  let data = await db.getMatches(id);
  // cant find that match
  if (!data) return next('route');
  // found it, move on to the routes

  data['rounds'] = await db.rounds();
  data['round'] = id;

  res.render('wcq/round/round', data);
});

module.exports = router;
