'use strict';

const express = require('express')
  , accountService = require("../../lib/accountService.js")
  , util = require('../../lib/util.js')
  , router = express.Router();



router.get('/', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
try{
    let user = await accountService.getAccount(req.user.name);

    res.render('admin/strikes/index', {user:user});

} catch(err){
    console.log(err);
}
});



module.exports = router;