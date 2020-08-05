'use strict';
const db = require('../../lib/teamservice.js')
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router();

router.get('/:teamId', util.checkCache, async function(req, res){
  let data = await db.getTeamStats(req.params.teamId);


  res.render('team/oldteam', data);
});

module.exports = router;