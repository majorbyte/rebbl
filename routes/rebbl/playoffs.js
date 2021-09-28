'use strict';
const util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});

router.get('/seeding/playoffs', util.cache(10*60), async function(req,res) {
  let division = req.params.division;
  division === "REBBL Playoffs Season 17";

  res.render('rebbl/playoffs/predictions', {division:division, playoffs:true});
});
router.get('/seeding/challengers', util.cache(10*60), async function(req,res) {
  let division = req.params.division;
  division === "REBBL Challenger's Cup Season 17";

  res.render('rebbl/playoffs/predictions', {division:division, playoffs:false});
});
  

router.get('/:division', util.cache(10*60), async function(req,res) {
  let division = req.params.division;
  if (division === "playins - s10"){
    division = "Play-Ins Qualifier";
  }

  res.render('rebbl/playoffs/knockout', {division:division});
});

module.exports = router;