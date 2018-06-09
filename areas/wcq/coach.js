'use strict';
const db = require('../../lib/WorldCupQualifierService.js')
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

router.get('/:coach_id', checkCache, async function(req, res, next){
  let data =  await db.getCoach(req.params.coach_id);
  data['rounds'] = await db.rounds();

  res.render('wcq/coach/coach', data);
});

module.exports = router;
