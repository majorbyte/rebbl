'use strict';
const db = require('../../lib/WorldCupQualifierService.js')
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router();

router.get('/:round_id', util.checkCache, async function(req, res, next){
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
