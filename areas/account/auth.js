'use strict';

const express = require('express')
  , crypto = require('crypto')
  , passport = require('passport')
  , RedditStrategy = require('passport-reddit').Strategy
  , router = express.Router();


router.get('/reddit', function(req, res, next){
  req.session.state = crypto.randomBytes(32).toString('hex');
  req.session.save();
  passport.authenticate('reddit', {
    state: req.session.state,
    duration: 'permanent'
  })(req, res, next);
});

router.get('/reddit/callback', function(req, res, next){
  try {
    // Check for origin via state token
    if (req.query.state == req.session.state){
      passport.authenticate('reddit', {
        successRedirect: req.session.returnUrl || '/',
        failureRedirect: '/login'
      })(req, res, next);
    }
    else {
      next( new Error(403) );
    }
  }catch(ex){
      console.log(ex.message)
      console.log(ex.stack);
  }

});

module.exports = router;