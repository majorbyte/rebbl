'use strict';
const   
  leagueService = require("../../lib/LeagueService.js")
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router();

router.get('/unplayed/:match_id', async function(req, res, next){
  try{
    let match = await leagueService.getUnplayedMatch(req.params.match_id);

    res.render('account/match',{match: match} );
  } catch(err){
    console.log(err);
  }
});

router.get('/:match_id', util.checkCache, async function(req, res, next){
  let data = await leagueService.getMatchDetails(req.params.match_id);
  if (!data) return next('route');
  data['rounds'] = await leagueService.rounds();

  res.render('rebbl/match/match', data);
});



module.exports = router;