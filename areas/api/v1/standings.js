'use strict';
const db = require('../../../lib/LeagueService.js')
  , util = require('../../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});

router.get('/:league', util.checkCache, async function(req, res){
  let standings = await db.getCoachScore("REBBL - " + req.params.league);


  res.sendResponse(
    standings.sort(function (a, b) {
      if (a.competition > b.competition){
        return 1
      }
      if (b.competition > a.competition){
        return -1
      }
      if (a.points > b.points) {
        return -1
      }
      if (b.points > a.points) {
        return 1
      }
      if (a.tddiff > b.tddiff) {
        return -1
      }
      if (b.tddiff > a.tddiff) {
        return 1
      }
      if (a.loss > b.loss) {
        return 1
      }
      if (b.loss > a.loss) {
        return -1
      }
      return 0;
    })
  );


});

module.exports = router;