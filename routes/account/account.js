'use strict';

const accountService = require("../../lib/accountService.js")
  , datingService = require("../../lib/DatingService.js")
  , express = require('express')
  , leagueService = require("../../lib/LeagueService.js")
  , util = require('../../lib/util.js');

class Account{
	constructor(){
		this.router = express.Router();
	}


  routesConfig(){
    this.router.get('/login', function(req, res){res.render('account/login');});

    this.router.get('/', util.ensureAuthenticated, this._getAccount);
    this.router.get('/match',util.ensureAuthenticated, this._getMatch);
    this.router.get('/trophies',util.ensureAuthenticated, this._getTrophies);

    this.router.post('/trophies/hide',util.ensureAuthenticated, this._hideTrophy);
    this.router.post('/trophies/show',util.ensureAuthenticated, this._showTrophy);
    this.router.post('/update', util.ensureAuthenticated, this._updateAccount);

    this.router.put('/unplayed/:match_id', util.ensureAuthenticated, this._scheduleMatch);

    return this.router;
  }


  async _getAccount(req, res){
    try{
      if (!res.locals.user){
        res.redirect('/signup');
      } else {
        res.render('account/account', { user: res.locals.user });
      }
    } catch(err){
      console.log(err);
    }
  }

  async _getMatch(req, res){
    try{
      let match = await leagueService.getUpcomingMatch(req.user.name);
      res.render('account/match',{matches: match, user:res.locals.user} );
    } catch(err){
      console.log(err);
    }
  }

  async _getTrophies(req, res){
    try{
  
      const user =  await accountService.searchAccount({"reddit": {$regex: new RegExp(`^${req.user.name}`,"i")}});
  
      res.render('account/trophies',{user:user} );
    } catch(err){
      console.log(err);
    }
  }

  async _showTrophy(req, res){
    try{
      const user = await accountService.updateTrophy(req.user.name, Number(req.body.index));
      res.render('account/trophies',{user:user} );
    } catch(err){
      console.log(err);
    }
  }

  async _hideTrophy(req, res){
    try{
      const user = await accountService.hideTrophy(req.user.name, Number(req.body.index));
      res.render('account/trophies',{user:user} );
    } catch(err){
      console.log(err);
    }
  }

  async _scheduleMatch(req, res, next){
    try{
      let contest = await leagueService.searchLeagues({"contest_id":Number(req.params.match_id), "opponents.coach.name": {$regex: new RegExp(res.locals.user.coach, "i")} })
  
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
  }

  async _updateAccount(req, res){
    try{
      let account = { reddit: req.user.name
        , discord:  req.body.discord
        , steam: req.body.steam
        , timezone: req.body.timezone
        , twitch: req.body.twitch
        , useDark: req.body.useDark
        , showDonation: (req.body.showDonation === "on")
      };
  
      account = await accountService.updateAccount(account);
  
      res.redirect('/account');
    } catch(err){
      console.log(err);
    }
  }
}






module.exports = Account;