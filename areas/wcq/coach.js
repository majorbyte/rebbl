'use strict';
const db = require('../../lib/WorldCupQualifierService.js')
      , util = require('../../lib/util.js')
      , express = require('express')
      , router = express.Router();

router.get('/:coach_id', util.checkCache, async function(req, res, next){
  let data =  await db.getCoach(req.params.coach_id);
  data['rounds'] = await db.rounds();

  res.render('wcq/coach/coach', data);
});

module.exports = router;
