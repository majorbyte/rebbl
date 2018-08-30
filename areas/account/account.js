'use strict';

const express = require('express')
  , accountService = require("../../lib/accountService.js")
  , leagueService = require("../../lib/LeagueService.js")
  , datingService = require("../../lib/DatingService.js")
  , util = require('../../lib/util.js')
  , router = express.Router();





router.get('/', util.ensureAuthenticated, async function(req, res){
  try{
    let user = await accountService.getAccount(req.user.name);

    if (!user){
      res.redirect('/signup');
    } else {
      res.render('account/account', { user: user });
    }


  } catch(err){
    console.log(err);
  }
});

router.get('/login', function(req, res){
  res.render('account/login');
});

router.get('/match',util.ensureAuthenticated, async function(req, res){
  try{
    let match = await leagueService.getUpcomingMatch(req.user.name);
    let user = await accountService.getAccount(req.user.name)
    res.render('account/match',{matches: match, user:user} );
  } catch(err){
    console.log(err);
  }
});

router.put('/unplayed/:match_id', util.ensureAuthenticated, async function(req, res, next){
  try{
    let user = await accountService.getAccount(req.user.name)
    let contest = await leagueService.searchLeagues({"contest_id":Number(req.params.match_id), "opponents.coach.name": {$regex: new RegExp(user.coach, "i")} })

    if(contest.length > 0){
      if (req.body.date.length === 16)
        datingService.updateDate(Number(req.params.match_id), req.body.date);
      else 
        datingService.removeDate(Number(req.params.match_id));
      res.send("ok");
    } else {
      res.status(403).send();
    }
  } catch(err){
    console.log(err);
  }
});

router.post('/update', util.ensureAuthenticated, async function(req, res){
  try{
    let account = { reddit: req.user.name
      , discord:  req.body.discord
      , steam: req.body.steam
      , timezone: req.body.timezone
      , twitch: req.body.twitch
    };

    account = await accountService.saveAccount(account);

    res.render('account/account', { user: account });
  } catch(err){
    console.log(err);
  }
});


module.exports = router;