'use strict';

const accountService = require("../../lib/accountService.js") 
  , crypto = require('crypto')
  , express = require('express')
  , axios = require('axios')
  , passport = require('passport')
  , { URLSearchParams } = require('url');


  const CLIENT_ID = process.env['discord.clientId'];
  const CLIENT_SECRET = process.env['discord.clientSecret'];
  const REDIRECT_URI = process.env['discord.callbackURL'];

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
      if (CLIENT_ID) {
        res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&scope=identify&response_type=code&redirect_uri=${REDIRECT_URI}`);
      }
    });

    this.router.get('/discord/callback', this._authDiscordCallback);
    return this.router;
  }

  async _authDiscordCallback(req, res, next) {
    try {
      if (!req.query.code) {
        next( new Error(403) );
        return
      }


      const code = req.query.code;

      const params = new URLSearchParams();
      params.append('client_id', CLIENT_ID);
      params.append('client_secret', CLIENT_SECRET);
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', REDIRECT_URI);
      params.append('scope', 'identify');


      const options = {
        baseURL: 'https://discord.com',
        url: '/api/oauth2/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data:params
      }

      const response = await axios(options);
      const token = response.data.access_token;
      if (!token) {
        res.status(403).send();
        return;
      }
      await Authentication._updateDiscord(token, res);
      res.redirect('/account');
    } catch (ex) {
      console.log(ex.message);
      console.log(ex.stack);
    }
  }

  static async _updateDiscord(token, res) {
    const response = await axios(`https://discord.com/api/oauth2/@me`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      }
    );

    const discordUser = response.data.user;
    
    if (!discordUser) {
      console.log(response);
      res.status(403).send();
      return;
    }

    let account = res.locals.user;
    account.discordId = discordUser.id;
    account.discord = discordUser.username;

    await accountService.updateAccount(account);
  }
}  

module.exports = Authentication;