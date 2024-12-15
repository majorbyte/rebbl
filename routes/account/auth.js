'use strict';

const discordService = require("../../lib/DiscordService.js")
  , crypto = require('crypto')
  , express = require('express')
  , passport = require('passport');


  const CLIENT_ID = process.env['discordClientId'];
  const CLIENT_SECRET = process.env['discordClientSecret'];
  const REDIRECT_URI = process.env['discordCallbackURL'];

class Authentication{
	constructor(){
		this.router = express.Router();
	}
  
  routesConfig(){
    this.router.get('/reddit', function(req, res, next){
      passport.authenticate('reddit', {
        duration: 'permanent'
      })(req, res, next);
    });
    
    this.router.get('/reddit/callback', function(req, res, next){
      try {
          passport.authenticate('reddit', {
            successRedirect: '/',
            failureRedirect: '/account/login'
          })(req, res, next);
      }catch(ex){
          console.log(ex.message);
          console.log(ex.stack);
      }
    });


    this.router.get('/discord', function(req, res, next){
      if (CLIENT_ID) {
        res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&scope=identify&response_type=code&redirect_uri=${REDIRECT_URI}`);
      }
    });

    this.router.get('/discord/callback', this._authDiscordCallback);
    return this.router;
  }

  async _authDiscordCallback(req, res, next) {
    const token = await discordService.authDiscordCallback(req.query.code, REDIRECT_URI);
    if (!token) {
      res.status(403).send();
      return;
    }

    const result = await discordService.updateDiscord(token, res.locals.user);
    if (!result){
      res.status(403).send();
      return;
    }
    res.redirect('/account');
  }
}  

module.exports = Authentication;