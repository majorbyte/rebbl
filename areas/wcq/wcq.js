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

router.get('/', checkCache, async function(req, res, next){
  let data = await db.getCoaches();
  data['rounds'] = await db.rounds();

  res.render('wcq/index', data);
});

router.use('/coach', require(`./coach.js`));

router.use('/match', require(`./match.js`));

router.use('/round', require(`./round.js`));

module.exports = router;