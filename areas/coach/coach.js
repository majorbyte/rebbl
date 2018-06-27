'use strict';
const express = require('express')
  , leagueService = require('../../lib/LeagueService.js')
  , wcqService = require('../../lib/WorldCupQualifierService.js')
  , accountService = require("../../lib/accountService.js")
  , util = require('../../lib/util.js')
  , router = express.Router();


router.get('/:coach', async function(req, res){
  try{
    let user = await accountService.searchAccount({"coach":req.params.coach});

    res.render('coach/coach', { user: user});
  } catch(err){
    console.log(err);
  }
});

router.get('/login', function(req, res){
  res.render('account/login');
});



module.exports = router;