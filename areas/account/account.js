'use strict';

const express = require('express')
  , accountService = require("../../lib/accountService.js")
  , util = require('../../lib/util.js')
  , router = express.Router();





router.get('/', util.ensureAuthenticated, async function(req, res){
  try{
    let user = await accountService.getAccount(req.user.name);

    res.render('account/account', { user: user });
  } catch(err){
    console.log(err);
  }
});

router.get('/login', function(req, res){
  res.render('account/login');
});

router.post('/update', util.ensureAuthenticated, async function(req, res){
  try{
    let account = { reddit: req.user.name
      , discord:  req.body.discord
      , steam: req.body.steam
      , timezone: req.body.timezone };

    account = await accountService.saveAccount(account);

    res.render('account/account', { user: account });
  } catch(err){
    console.log(err);
  }
});


module.exports = router;