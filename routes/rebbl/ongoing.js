'use strict';
const 
  express = require('express')
  , accountService = require("../../lib/accountService.js")
  , util = require('../../lib/util.js')
  , router = express.Router({mergeParams: true});

router.get('/', async function(req, res){
    res.render("rebbl/upcoming/ongoing");
});

module.exports = router;