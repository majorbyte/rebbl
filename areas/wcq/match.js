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


router.get('/:match_id', checkCache, async function(req, res, next){
  let data = await db.getMatchDetails(req.params.match_id);
  if (!data) return next('route');
  data['rounds'] = await db.rounds();

  res.render('wcq/match/match', data);
});

module.exports = router;


/*
exports.before = async function(req, res, next){
  console.log('wcq&match');
  var id = req.params.match_id;
  if (!id) return next();

  req.match= await db.getMatchDetails(id);
  // cant find that match
  if (!req.match) return next('route');
  // found it, move on to the routes
  next();
};

exports.cache = function(req, res, next){
  let key = '__match__' + req.originalUrl || req.url;
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

exports.show = async function(req, res, next){
  req.match['rounds'] = await db.rounds();
  res.render('show', req.match);
};
*/