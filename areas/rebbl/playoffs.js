'use strict';
const db = require('../../lib/LeagueService.js')
  , util = require('../../lib/util.js')
  , datingService = require("../../lib/DatingService.js")
  , express = require('express')
  , router = express.Router({mergeParams: true});

router.get('/:division', util.checkCache, async function(req,res) {
  let division  = req.params.division;
  if (division === "playins - s10"){
    division = "Play-Ins Qualifier";
  }

  res.render('rebbl/playoffs/knockout', {division:division});
});

module.exports = router;