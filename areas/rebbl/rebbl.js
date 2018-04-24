'use strict';

const express = require('express'),
  router = express.Router();


router.get('/', function (req, res, next) {
  res.redirect('coach');
});

router.use('/match', require(`./match`));

//router.use('/coach', require(`./coach`));

router.use('/:league', require(`./league`));

router.use('/:league/:division', require(`./division`));

module.exports = router;