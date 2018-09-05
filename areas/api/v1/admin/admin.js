'use strict';

const express = require('express'),
  router = express.Router();

router.use('/user', require(`./user.js`));

router.use('/strikes', require(`./strikes.js`));


module.exports = router;