'use strict';

const express = require('express')
  , signupService = require('../../lib/signupService')
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


router.get('/', ensureAuthenticated, async function(req, res){
  try{
    let user = await signupService.getExistingTeam(req.user.name);
    let signup = await signupService.getSignup(req.user.name);

    if (signup){
      signup.signedUp = true;
    } else if (user) {
      user.signedUp = false;
    }
    res.render('signup/overview', { user: signup || user || {reddit: req.user.name, isNew :true} });
  } catch (err){
    console.log(err);
  }
});

router.get('/change', ensureAuthenticated, async function(req, res){
  try {
    let user = await signupService.getExistingTeam(req.user.name);
    let signup = await signupService.getSignup(req.user.name);

    if(!signup && user){
      res.render('signup/signup-existing', { user: user});
      return;
    }

    if (!signup){
      res.render('signup/signup-new-coach', {user: req.user.name});
      return;
    }

    switch(signup.saveType){
      case "existing":
        res.render('signup/signup-existing', { user: signup || user});
        break;
      case "reroll":
        res.render('signup/signup-reroll', {user: signup});
        break;
      case "new":
        res.render('signup/signup-new-coach', {user: signup});
        break;
      default:
        res.render('signup/signup-new-coach', {user: req.user.name});
        break;
    }
  } catch (err){
    console.log(err);
  }
});

router.get('/reroll', ensureAuthenticated, async function(req, res){
  try {
    let user = await signupService.getExistingTeam(req.user.name);
    let signup = await signupService.getSignup(req.user.name);
    if (user) {
      user.team = "";
      user.race = "";
      res.render('signup/signup-reroll', { user: signup || user });
    }
    else {
      res.render('signup/signup-new-coach', { user: signup });
    }
  } catch (err){
    console.log(err);
  }
});



router.post('/confirm-existing', ensureAuthenticated, async function(req, res){
  try{
    //remove unwanted input
    delete req.body.coach;
    delete req.body.team;

    req.body.saveType = "existing";
    await signupService.saveSignup(req.user.name, req.body);

    res.redirect('/signup');
  } catch (err){
    console.log(err);
  }
});

router.post('/confirm-reroll', ensureAuthenticated, async function(req, res){
  try{
    //remove unwanted input
    delete req.body.coach;

    req.body.saveType = "reroll";
    let user = await signupService.saveSignup(req.user.name, req.body);

    if (user.error){
      res.render('signup/signup-reroll', {user: user});
    } else {
      res.render('signup/signup-confirmed-greenhorn', {user: user});
    }
  } catch (err){
    console.log(err);
  }
});

router.post('/confirm-new', ensureAuthenticated, async function(req, res){
  try {
    req.body.saveType = "new";
    let user = await signupService.saveSignup(req.user.name, req.body);

    if (user.error){
      res.render('signup/signup-new-coach', {user: user});
    } else {
      res.render('signup/signup-confirmed-greenhorn', {user: user});
    }
  } catch (err){
    console.log(err);
  }
});

router.post('/confirm-greenhorn', ensureAuthenticated, async function(req, res){
  try{
    await signupService.saveGreenhornSignup(req.user.name);

    res.redirect('/signup');
  } catch (err){
    console.log(err);
  }
});


router.post('/resign', ensureAuthenticated, async function(req,res){
  try{
    await signupService.resign(req.user.name);
    res.redirect('/signup');
  } catch (err){
    console.log(err);
  }
});

router.post('/resign-greenhorn', ensureAuthenticated, async function(req,res){
  try{
    await signupService.resignGreenhorn(req.user.name);
    res.redirect('/signup');
  } catch (err){
    console.log(err);
  }
});


module.exports = router;