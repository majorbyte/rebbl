'use strict';

const crypto = require('crypto')
  , express = require('express')
  , fetch = require('node-fetch')
  , passport = require('passport')
  , { URLSearchParams } = require('url');


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
      if (process.env['discordKey']) {
        var CLIENT_ID = process.env['discordKey'];
        var REDIRECT_URI = process.env['discordcallbackURL'];
        res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&scope=identify&response_type=code&redirect_uri=${REDIRECT_URI}`);
      }
    });

    this.router.get('/discord/callback', async function(req, res, next) {
      try {
        if (!req.query.code) {
          next( new Error(403) );
          return
        }
  
        var CLIENT_ID = process.env['discordKey'];
        var CLIENT_SECRET = process.env['discordSecret'];
        var REDIRECT_URI = process.env['discordcallbackURL'];
        var code = req.query.code;
  
        const params = new URLSearchParams();
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', REDIRECT_URI);
        params.append('scope', 'identify');
  
        const response = await fetch(`https://discord.com/api/oauth2/token`,
          {
            method: 'POST',
            body: params,
          }
        );
  
        const json = await response.json();
        const accessToken = json.access_token;
  
        res.redirect(`/account/discord/update?token=${json.access_token}`);
      } catch (ex) {
        console.log(ex.message);
        console.log(ex.stack);
      }
    });
    return this.router;
  }
}  

module.exports = Authentication;