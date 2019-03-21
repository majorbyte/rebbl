'use strict';
const 
  express = require('express')
  , accountService = require("../../lib/accountService.js")
  , util = require('../../lib/util.js')
  , router = express.Router({mergeParams: true});

router.get('/', async function(req, res){
  if(res.locals.user) {
    let user = await accountService.getAccount(req.user.name)
    res.render("rebbl/upcoming/index",{user:user});
  } else {
    res.render("rebbl/upcoming/index");
  }
});

module.exports = router;