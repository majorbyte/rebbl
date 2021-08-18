'use strict';

const accountService = require("../../lib/accountService.js")
  , discordService = require("../../lib/DiscordService.js")
  , crypto = require('crypto')
  , express = require('express')
  , axios = require('axios')
  , passport = require('passport')
  , { URLSearchParams } = require('url');


  const CLIENT_ID = process.env['discordClientId'];
  const CLIENT_SECRET = process.env['discordClientSecret'];
  const REDIRECT_URI = process.env['discordCallbackURL'];

class Authentication{
	constructor(){
		this.router = express.Router();
	}
  
  routesConfig(){
    this.router.get('/reddit', function(req, res, next){
      req.session.state = crypto.randomBytes(32).toString('hex');
      req.session.save();
      passport.authenticate('reddit', {
        state: req.session.state,
        duration: 'permanent'
      })(req, res, next);
    });
    
    this.router.get('/reddit/callback', function(req, res, next){
      try {
        // Check for origin via state token
        if (req.query.state === req.session.state){
          passport.authenticate('reddit', {
            successRedirect: req.session.returnUrl || '/',
            failureRedirect: '/login'
          })(req, res, next);
        }
        else {
          next( new Error(403) );
        }
      }catch(ex){
          console.log(ex.message);
          console.log(ex.stack);
      }
    });


    this.router.get('/discord', function(req, res, next){
      console.log(`clientid: ${CLIENT_ID}`);
      console.log(`process.env['discordClientId']:${process.env['discordClientId']}`);
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