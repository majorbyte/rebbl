
'use strict';
const dataService = require('../../../lib/DataService.js').rebbl
  , util = require('../../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});


router.get('/:league/:division', util.checkCache, async function(req, res){


  let standings = await dataService.getStandings({"league":new RegExp(`^${req.params.league}`,"i"), "competition":new RegExp(`^${req.params.division}`,"i")});

  res.status(200).send(standings);
});

module.exports = router;