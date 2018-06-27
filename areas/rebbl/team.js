'use strict';
const db = require('../../lib/TeamService')
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router();

router.get('/:team_id', util.checkCache, async function(req, res, next){
  let data =  await db.getTeamStats(req.params.team_id);

  res.sendResponse(data);
});

module.exports = router;