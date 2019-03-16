
'use strict';
const dataService = require('../../../lib/DataService.js').rebbl
  , util = require('../../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});


router.get("/",util.checkCache, async function(req,res,next){
  try {
    let leagues = await dataService.getLeague({});
    res.status(200).send(leagues);
  }
  catch (ex){
    console.error(ex);
    res.status(500).send('Something something error');
  }
});

router.get('/:leagueId', util.checkCache, async function(req, res){
  try {
    let league = await dataService.getTeam({"id":Number(req.params.leagueId)});
    res.status(200).send(league);
  }
  catch (ex){
    console.error(ex);
    res.status(500).send('Something something error');
  }
});




module.exports = router;