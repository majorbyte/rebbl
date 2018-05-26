'use strict';

const express = require('express'),
  router = express.Router();

router.use('/standings', require(`./standings`));

router.use('/greenhorn', require(`./greenhorn`));

router.use('/signups', require(`./signups`));


module.exports = router;