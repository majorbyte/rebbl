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

router.get('/:coach_id', checkCache, async function(req, res, next){
  res.redirect(`/rebbl/coach/${req.params.coach_id}/matches`);
});

router.get('/:coach_id/team', checkCache, async function(req, res, next){
  let data =  await db.getCoach(req.params.coach_id);
  data.matches = await db.getMatchesForCoach(req.params.coach_id);
  res.render('rebbl/coach/coach', data);
});

router.get('/:coach_id/matches', checkCache, async function(req, res, next){
  let data =  await db.getCoach(req.params.coach_id);
  data.matches = await db.getMatchesForCoach(req.params.coach_id);
  res.render('rebbl/coach/coach', data);
});

module.exports = router;