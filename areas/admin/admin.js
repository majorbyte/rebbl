'use strict';

const express = require('express')
  , util = require('../../lib/util.js')
  , router = express.Router();



router.use('/user', require(`./user.js`));

router.use('/strikes', require(`./strikes.js`));


router.get('/', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  res.redirect("user");
})
module.exports = router;