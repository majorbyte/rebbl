'use strict';

const express = require('express')
  , accountService = require("../../lib/accountService.js")
  , util = require('../../lib/util.js')
  , router = express.Router();



  router.get('/', util.hasRole("admin"), async function(req, res){
    try{
      let user = await accountService.getAccount(req.user.name);
  
      res.render('admin/user/index', {account:user});
  
    } catch(err){
      console.log(err);
    }
  });
  

  router.get('/add', util.hasRole("admin"), async function(req, res){
    try{
      res.render('admin/user/user', { account: null, admin:res.locals.user });
  
    } catch(err){
      console.log(err);
    }
  });

router.get('/:user', util.hasRole("admin"), async function(req, res){
  try{
  
    res.render('admin/user/user', { account: req.params.user, admin:res.locals.user });

  } catch(err){
    console.log(err);
  }
});


router.post('/update', util.hasRole("admin"), async function(req, res){
  try{
    let account = { reddit: req.body.reddit
      , coach: req.body.coach      
      , steam: req.body.steam
      , timezone: req.body.timezone
      , twitch: req.body.twitch
      , team: req.body.team
      , race: req.body.race
    };

    await accountService.updateAccount(account);

    res.render('admin/user/user', { account: req.body.reddit, admin:res.locals.user });
  } catch(err){
    console.log(err);
  }
});

router.post('/new', util.hasRole("admin"), async function(req, res){
  try{
    let account = { reddit: req.body.reddit
      , coach: req.body.coach      
      , steam: req.body.steam
      , timezone: req.body.timezone
      , twitch: req.body.twitch
      , team: req.body.team
      , race: req.body.race
    };

    await accountService.saveAccount(account);

    res.render('admin/user/user', { account: req.body.reddit, admin:res.locals.user });
  } catch(err){
    console.log(err);
  }
});


module.exports = router;