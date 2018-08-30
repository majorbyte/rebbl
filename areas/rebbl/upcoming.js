'use strict';
const 
  express = require('express')
  , accountService = require("../../lib/accountService.js")
  , util = require('../../lib/util.js')
  , router = express.Router({mergeParams: true});

router.get('/', util.checkAuthenticated, async function(req, res){
  if(req.user) {
    let user = await accountService.getAccount(req.user.name)
    res.render("rebbl/upcoming/index",{user:user});
  } else {
    res.render("rebbl/upcoming/index");
  }
});

module.exports = router;