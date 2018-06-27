'use strict';
const db = require('../../lib/WorldCupQualifierService.js')
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router();

router.get('/', util.checkCache, async function(req, res, next){
  let data = await db.getCoaches();
  data['rounds'] = await db.rounds();

  res.render('wcq/index', data);
});

router.use('/coach', require(`./coach.js`));

router.use('/match', require(`./match.js`));

router.use('/round', require(`./round.js`));

module.exports = router;