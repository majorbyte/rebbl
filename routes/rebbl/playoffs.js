'use strict';
const util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});

router.get('/:division', util.cache(10*60), async function(req,res) {
  let division = req.params.division;
  if (division === "playins - s10"){
    division = "Play-Ins Qualifier";
  }

  res.render('rebbl/playoffs/knockout', {division:division});
});

module.exports = router;