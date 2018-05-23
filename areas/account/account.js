'use strict';

const express = require('express')
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


router.get('/', ensureAuthenticated, function(req, res){
  res.render('account/account', { user: req.user });
});

router.get('/login', function(req, res){
  res.render('account/login', { user: req.user });
});

module.exports = router;