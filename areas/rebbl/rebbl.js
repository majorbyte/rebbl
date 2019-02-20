'use strict';

const express = require('express'),
  router = express.Router();


router.get('/', function (req, res, next) {
  res.redirect('coach');
});

router.use('/match', require(`./match.js`));

router.use('/coach', require(`./coach.js`));

router.use('/stunty', require(`./stunty.js`));

router.use('/upcoming', require(`./upcoming.js`));

router.use('/team', require(`./team.js`));

router.use('/playoffs', require(`./playoffs.js`));

router.use('/:league', require(`./league.js`));

router.use('/:league/:division', require(`./division.js`));

module.exports = router;