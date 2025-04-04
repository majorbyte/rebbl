'use strict';

const accountService = require("../../lib/accountService.js")
  , bb3service = require("../../lib/bb3Service.js")
  , datingService = require("../../lib/DatingService.js")
  , dataService = require("../../lib/DataService.js").rebbl
  , express = require('express')
  , leagueService = require("../../lib/LeagueService.js")
  , util = require('../../lib/util.js');

class Account{
	constructor(){
		this.router = express.Router();
    this.template = "bb3/account";
    this.router.use((req, _, next) => { 
      this.template = req.subdomains.some(x => ["bb2","clan"].indexOf(x.toLowerCase()) > -1) ? "account" : "bb3/account"; 
      return next();
    });
	}


  routesConfig(){
    this.router.get('/login', (_,res) => res.render(`${this.template}/login`));
    //this.router.get('/logout', function(req, res){req.logout(); res.redirect('/');});
    this.router.get('/logout', function(req, res, next) {
      req.logout(function(err) {
        if (err) { return next(err); }
        req.session.destroy();
        res.redirect('/');
      });
    });    

    this.router.get('/create', util.ensureLoggedIn, this._getCreateAccount.bind(this));
    this.router.post('/create', util.ensureLoggedIn, this._createAccount.bind(this));

    this.router.get('/', util.checkAuthenticated, util.ensureAuthenticated, this._getAccount.bind(this));
    
    this.router.get('/discord', util.checkAuthenticated, util.ensureAuthenticated, this._discord.bind(this));
    this.router.get('/nodiscord', util.checkAuthenticated, util.ensureAuthenticated, this._noDiscord.bind(this));

    this.router.get('/match',util.checkAuthenticated, util.ensureAuthenticated, this._getMatch.bind(this));
    this.router.get('/reports',util.checkAuthenticated, util.ensureAuthenticated, async (_,res) => res.render(`${this.template}/reports`) );
    this.router.get('/trophies',util.checkAuthenticated, util.ensureAuthenticated, this._getTrophies.bind(this));
    this.router.get('/discord/delete', util.checkAuthenticated, util.ensureAuthenticated, this._removeDiscord.bind(this));

    this.router.post('/trophies/hide',util.checkAuthenticated, util.ensureAuthenticated, this._hideTrophy.bind(this));
    this.router.post('/trophies/show',util.checkAuthenticated, util.ensureAuthenticated, this._showTrophy.bind(this));
    this.router.post('/update', util.checkAuthenticated, util.ensureAuthenticated, this.#updateAccount.bind(this));

    this.router.put('/unplayed/:match_id', util.checkAuthenticated, util.ensureAuthenticated, this._scheduleMatch.bind(this));

    return this.router;
  }

  

  async _getAccount(req, res){
    try{
      if (!res.locals.user){
        res.redirect('/signup');
      } else {
        let account = res.locals.user;
        if(account.following){
          let coaches = [];
          for(var x = 0; x < account.following.length; x++){
            let schedule = await dataService.getSchedule({"opponents.coach.id" : account.following[x]});
            if (!schedule) {
              schedule = await dataService.getSchedule({"matches.opponents.coach.id" : account.following[x]});
              if (schedule) {
                schedule = schedule.matches.find(m => m.opponents.some(o => o.coach.id ===account.following[x]));
              }
            }
            if (schedule){
              const coach = schedule.opponents.find(function(a){return a.coach.id === account.following[x];}).coach;
              coaches.push(coach);
            }
          }
          account.following = coaches;
        }
        return res.render(`${this.template}/account`, { user: account });
      }
    } catch(err){
      console.log(err);
    }
  }

  async _getCreateAccount(req, res){
    try{
      if (!req.user.name){
        res.redirect('/signup');
      } else {
        res.render(`${this.template}/create`, { user: req.user.name});
      }
    } catch(err){
      console.log(err);
    }
  }

  async _getMatch(req, res){
    try{
      let match = await bb3service.getUpcomingMatch(req.user.name);
      res.render('account/match',{matches: match, user:res.locals.user} );
    } catch(err){
      console.log(err);
    }
  }

  
  

  async _getTrophies(req, res){
    try{
  
      const user = await accountService.searchAccount({"reddit": {$regex: new RegExp(`^${req.user.name}`,"i")}});
  
      res.render(`${this.template}/trophies`,{user:user} );
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

  async _scheduleMatch(req, res){
    try{
      let contest = [];
      if (req.params.match_id == 0){
        contest = await leagueService.searchLeagues({"unstarted.competitionId":Number(req.body.competitionId), "unstarted.coaches.coachName": {$regex: new RegExp(`^${res.locals.user.coach}$`, "i")} });
      } else if (req.body.clan) {
        contest = await leagueService.searchLeagues({"matches.contest_id":Number(req.params.match_id), "matches.opponents.coach.name": {$regex: new RegExp(`^${res.locals.user.coach}$`, "i")} });      
      } else {
        contest = await leagueService.searchLeagues({"contest_id":Number(req.params.match_id), "opponents.coach.name": {$regex: new RegExp(`^${res.locals.user.coach}$`, "i")} });
        if (contest.length === 0) contest = await leagueService.searchLeagues({matches:{$elemMatch:{contest_id:Number(req.params.match_id), "opponents.coach.name": {$regex: new RegExp(`^${res.locals.user.coach}$`, "i")}}} });
      }
      

      if(contest.length > 0){
        if (req.body.date && req.body.date.length === 16)
          datingService.updateDate(Number(req.params.match_id == 0 ? req.body.competitionId : req.params.match_id), req.body.date);
        else 
          datingService.removeDate(Number(req.params.match_id == 0 ? req.body.competitionId : req.params.match_id));
        res.send("ok");
      } else {
        res.status(403).send();
      }
    } catch(err){
      console.log(err);
    }
  }

  async _removeDiscord(req, res) {
    try {
      let account = res.locals.user;
      account.discordId = undefined;
      account.discord = undefined;
      account.discordOptedOut = true;
      await accountService.updateAccount(account);
      res.redirect('/account');
    } catch(err) {
      console.log(err);
    }
  }

  async _discord(req, res) {
    try{
      if (!res.locals.user){
        res.redirect('/signup');
      } else {
        let account = res.locals.user;
        res.render('account/discord', { user: account });
      }
    } catch(err){
      console.log(err);
    }
  }

  async _noDiscord(req, res) {
    try {
      let account = res.locals.user;
      account.discordId = undefined;
      account.discord = undefined;
      account.discordOptedOut = true;
      await accountService.updateAccount(account);
      res.redirect('/account');
    } catch(err) {
      console.log(err);
    }
  }

  async #updateAccount(req, res){
    try{
      let account = { reddit: req.user.name
        , steam: req.body.steam?.substring(0,100)
        , timezone: req.body.timezone?.substring(0,100)
        , twitch: req.body.twitch?.substring(0,100)
        //, useDark: req.body.useDark
        //, showDonation: req.body.showDonation === "on"
      };
  
      await accountService.updateAccount(account);
  
      res.redirect('/account');
    } catch(err){
      console.log(err);
    }
  }

  async _createAccount(req, res){
    try{
      let {bb3coach, bb3id, timezone, bb3service, bb3displayId} = req.body;
      let account ={bb3coach, bb3id, bb3service, bb3displayId, timezone};
       
      account.reddit = req.user.name;

      try{
        await accountService.createAccount(account);
        res.redirect('/account/discord');
      } catch(err){
        account.err = err;
        res.render('account/create', { account:account});
      }
  
    } catch(err){
      console.log(err);
    }
  }

}








module.exports = Account;