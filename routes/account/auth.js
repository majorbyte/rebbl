'use strict';

const crypto = require('crypto')
  , express = require('express')
  , passport = require('passport');


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

    return this.router;
  }
}  

module.exports = Authentication;