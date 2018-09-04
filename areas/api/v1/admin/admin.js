'use strict';

const express = require('express'),
  router = express.Router();

router.use('/user', require(`./user/user.js`));


module.exports = router;