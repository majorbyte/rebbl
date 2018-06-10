'use strict';

const express = require('express')
  , leagueService = require('../../lib/LeagueService.js')
  , wcqService = require('../../lib/WorldCupQualifierService.js')
  , accountService = require("../../lib/accountService.js")
  , router = express.Router();


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  req.session.returnUrl = req.baseUrl;
  res.redirect('/account/login');
}


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