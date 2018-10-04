'use strict';

const express = require('express')
  , util = require('../../lib/util.js')
  , signupService = require('../../lib/signupService.js')
  , accountService = require('../../lib/accountService.js')
  , router = express.Router();

  /*
router.get('/', util.ensureLoggedIn, async function(req, res){
  res.render('signup/closed');
});*/

router.post('/confirm-rampup',util.ensureLoggedIn, async function(req, res){
  try {
    req.body.saveType = "rampup";
    let user = await signupService.saveSignUp(req.user.name, req.body);

    if (user.error){
      res.render('signup/signup-rampup', {user: user});
    } else {
      res.redirect('/signup');
    }
  } catch (err){
    console.log(err);
  }
});


router.get('/', util.ensureLoggedIn, async function(req, res){
  try{
    let user = await signupService.getExistingTeam(req.user.name);
    let signup = await signupService.getSignUp(req.user.name);

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

router.get('/change', util.ensureLoggedIn, async function(req, res){
  try {
    let user = await signupService.getExistingTeam(req.user.name);
    let signup = await signupService.getSignUp(req.user.name);
    let account = await accountService.getAccount(req.user.name);

    // Disabled while during season
    if(!signup && user){
      res.render('signup/signup-existing', { user: user});
      return;
    }

    if (!signup){
      if(account){
        res.render('signup/signup-new-coach', {user: {account: account}});
        //res.render('signup/signup-rampup', {user: {account: account}});
      } else {
        res.render('signup/signup-new-coach', {user: req.user.name});
        //res.render('signup/signup-rampup', {user: req.user.name});
      }
      return;
    }
    let data = Object.assign(signup, account);
    switch(signup.saveType){
      case "existing":
        res.render('signup/signup-existing', { user: data});
        break;
      case "reroll":
        res.render('signup/signup-reroll', {user: data});
        break;
      case "new":
        if(account){
          signup.account = account;
        }
        res.render('signup/signup-new-coach', {user: signup});
        break;
      case "rampup":
        if(account){
          signup.account = account;
        }
        res.render('signup/signup-rampup', {user: signup});
        break;
      default:
        res.render('signup/signup-rampup', {user: req.user.name});
        break;
    }
  } catch (err){
    console.log(err);
  }
});

router.get('/reroll', util.ensureAuthenticated, async function(req, res){
  try {
    let user = await signupService.getExistingTeam(req.user.name);
    let signup = await signupService.getSignUp(req.user.name);
    let account = await accountService.getAccount(req.user.name);

    if (user) {
      user.team = "";
      user.race = "";
      if(signup) {
        signup.team = "";
        signup.race = "";
      }
      if(account){
        user = Object.assign(user, account);
        if(signup) signup = Object.assign(signup, account);
      }
      res.render('signup/signup-reroll', { user: signup || user });
    }
    else {
      res.render('signup/signup-new-coach', { user: signup });
    }
  } catch (err){
    console.log(err);
  }
});



router.post('/confirm-existing',util.ensureAuthenticated, async function(req, res){
  try{
    //remove unwanted input
    delete req.body.coach;
    delete req.body.team;

    req.body.saveType = "existing";
    let user = await signupService.saveSignUp(req.user.name, req.body);

    res.render('signup/signup-confirmed-oi', {user: user});
  } catch (err){
    console.log(err);
  }
});

router.get('/signup-oi',util.ensureAuthenticated, async function(req, res){
  try{

    let user = await signupService.getSignUp(req.user.name);

    res.render('signup/signup-confirmed-oi', {user: user});
  } catch (err){
    console.log(err);
  }
});

router.get('/signup-greenhorn',util.ensureAuthenticated, async function(req, res){
  try{

    let user = await signupService.getSignUp(req.user.name);

    res.render('signup/signup-confirmed-greenhorn', {user: user});
  } catch (err){
    console.log(err);
  }
});

router.post('/confirm-reroll', util.ensureAuthenticated, async function(req, res){
  try{
    //remove unwanted input
    delete req.body.coach;

    req.body.saveType = "reroll";
    let user = await signupService.saveSignUp(req.user.name, req.body);

    if (user.error){
      res.render('signup/signup-reroll', {user: user});
    } else {
      res.render('signup/signup-confirmed-greenhorn', {user: user});
      //res.redirect('/signup');
    }
  } catch (err){
    console.log(err);
  }
});

router.post('/confirm-new', util.ensureLoggedIn, async function(req, res){
  try {
    req.body.saveType = "new";
    let user = await signupService.saveSignUp(req.user.name, req.body);

    if (user.error){
      res.render('signup/signup-new-coach', {user: user});
    } else {
      res.render('signup/signup-confirmed-greenhorn', {user: user});
      //res.redirect('/signup');
    }
  } catch (err){
    console.log(err);
  }
});

router.post('/confirm-greenhorn', util.ensureAuthenticated, async function(req, res){
  try{
    await signupService.saveGreenhornSignUp(req.user.name);

    res.redirect('/signup');
  } catch (err){
    console.log(err);
  }
});

router.post('/confirm-oi', util.ensureAuthenticated, async function(req, res){
  try{
    await signupService.saveOISignUp(req.user.name);

    res.redirect('/signup');
  } catch (err){
    console.log(err);
  }
});


router.post('/resign', util.ensureAuthenticated, async function(req,res){
  try{
    await signupService.resign(req.user.name);
    res.redirect('/signup');
  } catch (err){
    console.log(err);
  }
});

router.post('/resign-greenhorn', util.ensureAuthenticated, async function(req,res){
  try{
    await signupService.resignGreenhorn(req.user.name);
    res.redirect('/signup');
  } catch (err){
    console.log(err);
  }
});

router.post('/resign-oi', util.ensureAuthenticated, async function(req,res){
  try{
    await signupService.resignOI(req.user.name);
    res.redirect('/signup');
  } catch (err){
    console.log(err);
  }
});

router.post('/confirm', util.ensureAuthenticated, async function(req,res){
  try{
    await signupService.confirm(req.user.name);
    res.redirect('/signup');
  } catch (err){
    console.log(err);
  }
});



router.get('/signups', util.checkCache, async function(req,res){
  try{
    let signups = await signupService.getSignUps();

    signups.all = signups.all.sort(function(a,b){

      if(a.league > b.league) return 1;
      if(a.league < b.league) return -1;

      if(a.saveType.replace("reroll", "f") > b.saveType.replace("reroll", "f")) return 1;
      if(b.saveType.replace("reroll", "f") > a.saveType.replace("reroll", "f")) return -1;

      if (a.coach.toLowerCase() < b.coach.toLowerCase()) return -1;
      if (a.coach.toLowerCase() > b.coach.toLowerCase()) return 1;

      return 0;

    });

    res.render('signup/signups', {signups: signups});
  } catch (err){
    console.log(err);
  }
});


module.exports = router;