'use strict';

const express = require('express'),
  router = express.Router();

router.use('/bloodbowl', require(`./bloodbowl.js`));

router.use('/standings', require(`./standings.js`));

router.use('/team', require(`./team.js`));


module.exports = router;