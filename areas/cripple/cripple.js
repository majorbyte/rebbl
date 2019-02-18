'use strict';

const express = require('express'),
  router = express.Router();


router.get('/', function (req, res, next) {

  

});

router.use('/counter', require(`./counter.js`));

router.use('/match', require(`./match.js`));

router.use('/standings', require(`./standings.js`));


module.exports = router;