'use strict';

const express = require('express'),
  router = express.Router();

router.use('/v1', require(`./v1/api.js`));

router.use('/v2', require(`./v2/api.js`));

module.exports = router;