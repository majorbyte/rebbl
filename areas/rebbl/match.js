'use strict';
const db = require('../../lib/LeagueService.js')
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router();

router.get('/:match_id', util.checkCache, async function(req, res, next){
  let data = await db.getMatchDetails(req.params.match_id);
  if (!data) return next('route');
  data['rounds'] = await db.rounds();

  res.render('rebbl/match/match', data);
});

module.exports = router;