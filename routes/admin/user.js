'use strict';

const express = require('express')
  , accountService = require("../../lib/accountService.js")
  , util = require('../../lib/util.js')
  , router = express.Router();



  router.get('/', util.hasRole("admin"), async function(req, res){
    try{
      let user = await accountService.getAccount(req.user.name);
  
      res.render('admin/user/index', {user:user});
  
    } catch(err){
      console.log(err);
    }
  });
  

  router.get('/add', util.hasRole("admin"), async function(req, res){
    try{
      res.render('admin/user/user', { user: null, admin:res.locals.user });
  
    } catch(err){
      console.log(err);
    }
  });

router.get('/:user', util.hasRole("admin"), async function(req, res){
  try{
  
    res.render('admin/user/user', { user: req.params.user, admin:res.locals.user });

  } catch(err){
    console.log(err);
  }
});


router.post('/update', util.hasRole("admin"), async function(req, res){
  try{
    let account = { reddit: req.body.reddit
      , coach: req.body.coach      
      , discord:  req.body.discord
      , steam: req.body.steam
      , timezone: req.body.timezone
      , twitch: req.body.twitch
      , team: req.body.team
      , race: req.body.race
    };

    await accountService.updateAccount(account);

    res.render('admin/user/user', { user: req.body.reddit, admin:res.locals.user });
  } catch(err){
    console.log(err);
  }
});

router.post('/new', util.hasRole("admin"), async function(req, res){
  try{
    let account = { reddit: req.body.reddit
      , coach: req.body.coach      
      , discord:  req.body.discord
      , steam: req.body.steam
      , timezone: req.body.timezone
      , twitch: req.body.twitch
      , team: req.body.team
      , race: req.body.race
    };

    await accountService.saveAccount(account);

    res.render('admin/user/user', { user: req.body.reddit, admin:res.locals.user });
  } catch(err){
    console.log(err);
  }
});


module.exports = router;