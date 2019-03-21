'use strict';
const 
  util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router();

router.get('/:team_id', util.checkCache, async function(req, res, next){
    res.render('rebbl/team/team');
});

module.exports = router;