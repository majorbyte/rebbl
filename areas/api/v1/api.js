'use strict';

const express = require('express'),
  router = express.Router();

router.use('/standings', require(`./standings`));

module.exports = router;