'use strict';
const express = require('express'),
 router = express.Router();


router.get('/', function (req, res, next) {
  res.redirect('/wcq/coach');
});

router.use('/coach', require(`./coach`));

router.use('/match', require(`./match`));

router.use('/round', require(`./round`));

module.exports = router;