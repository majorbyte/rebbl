'use strict';

const express = require('express'),
  router = express.Router();

router.use('/standings', require(`./standings.js`));

router.use('/greenhorn', require(`./greenhorn.js`));

router.use('/signups', require(`./signups.js`));

router.use('/upcoming', require(`./upcoming.js`));

router.use('/admin', require(`./admin/admin.js`));


module.exports = router;