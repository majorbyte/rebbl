'use strict';

const accountService = require('../../lib/accountService.js')
  , express = require('express')
  , util = require('../../lib/util.js')
  , signupService = require('../../lib/signupService.js');


class Signup{
  constructor(){
    this.router = express.Router();
  }

  routesConfig(){
    
    this.router.get('/', async function(req, res){
      res.render('signup/closed');
    });
/*

    this.router.post('/confirm-rampup',util.ensureLoggedIn, this._confirmRampup);
    */
  /*  
    this.router.get('/', util.ensureLoggedIn, this._getStatus);

    this.router.get('/change', util.ensureLoggedIn, this._changeSignup);

    this.router.post('/resign', util.ensureAuthenticated, this._resign);

  
    this.router.get('/reroll', util.ensureAuthenticated, this._reroll);

    this.router.post('/confirm-existing',util.ensureAuthenticated, this._confirmReturn);

    this.router.get('/signup-oi',util.ensureAuthenticated, this._signupOpenInvitational);

    this.router.get('/signup-greenhorn',util.ensureAuthenticated, this._signupGreenhornCup);

    this.router.post('/confirm-reroll', util.ensureAuthenticated, this._confirmReroll);

    this.router.post('/confirm-new', util.ensureLoggedIn, this._confirmNew);

    this.router.post('/confirm-greenhorn', util.ensureAuthenticated, this._confirmGreenhornCup);

    this.router.post('/confirm-oi', util.ensureAuthenticated, this._confirmOpenInvitational);


    this.router.post('/resign-greenhorn', util.ensureAuthenticated, this._resignGreenhornCup);

    this.router.post('/resign-oi', util.ensureAuthenticated, this._resignOpenInvitational);

    this.router.post('/confirm', util.ensureAuthenticated, this._checkConfirmation);
*/

    this.router.get('/signups', util.cache(10*60), function(req,res){res.render('signup/signups', {url: ""});});

    this.router.get('/signups/rebbrl', util.cache(10*60), function(req,res){res.render('signup/signups');});

    this.router.get('/counter', async function(req, res){res.render('signup/counter');});
/*
    this.router.get('/rebbrl', util.ensureLoggedIn, this._rebbrl);
    this.router.post('/confirm-new-rebbrl', util.ensureLoggedIn, this._confirmRebbrl);
    this.router.post('/resign-rebbrl', util.ensureLoggedIn, this._resignRebbrl);
*/
    return this.router;
  }

  async _getStatus(req, res){
    try{
      let user = await signupService.getExistingTeam(req.user.name);
      let signups = [];

      let signup = await signupService.getSignUp(req.user.name,"rebbl");

      if (signup){
        signup.signedUp = true;
        signups.push(signup);
      }

      signup = await signupService.getSignUp(req.user.name,"rebbrl");

      if (signup){
        signup.signedUp = true;
        signups.push(signup);
      }

      
      if (signups.length === 0 && user) {
        user.signedUp = false;
      }
      res.render('signup/overview', {signups:signups, user: signups.length > 0 ? signups[0] : user || {reddit: req.user.name, isNew :true} });
    } catch (err){
      console.log(err);
    }
  }

  async _changeSignup(req, res){
    try {
      let signup = await signupService.getSignUp(req.user.name,"rebbl");
      let account = await accountService.getAccount(req.user.name);

      // Disabled while during season
      let user = await signupService.getExistingTeam(req.user.name);
      if(!signup && user && user.team){
        res.render('signup/signup-existing', { user: user});
        return;
      }

      if (!signup){
        if(account){
          res.render('signup/signup-new-coach', {user: {account: account}});
          //res.render('signup/signup-rampup', {user: {account: account}});
        } else {
          res.render('signup/signup-new-coach', {user: req.user.name});
          //res.render('signup/signup-rampup', {user: req.user.name});
        }
        return;
      }
      let data = Object.assign(signup, account);
      switch(signup.saveType){
        case "existing":
          res.render('signup/signup-existing', { user: data});
          break;
        case "reroll":
          res.render('signup/signup-reroll', {user: data});
          break;
        case "new":
          if(account){
            signup.account = account;
          }
          res.render('signup/signup-new-coach', {user: signup});
          break;
        case "rampup":
          if(account){
            signup.account = account;
          }
          res.render('signup/signup-rampup', {user: signup});
          break;
        default:
          res.render('signup/signup-rampup', {user: req.user.name});
          break;
      }
    } catch (err){
      console.log(err);
    }
  }

  async _checkConfirmation(req,res){
    try{
      await signupService.confirm(req.user.name);
      res.redirect('/signup');
    } catch (err){
      console.log(err);
    }
  }


  /* seasonal */
  async _reroll(req, res){
    try {
      let user = await signupService.getExistingTeam(req.user.name);
      let signup = await signupService.getSignUp(req.user.name,"rebbl");
      let account = await accountService.getAccount(req.user.name);

      if (user) {
        user.team = "";
        user.race = "";
        if(signup) {
          signup.team = "";
          signup.race = "";
        }
        if(account){
          user = Object.assign(user, account);
          if(signup) signup = Object.assign(signup, account);
        }
        res.render('signup/signup-reroll', { user: signup || user });
      }
      else {
        res.render('signup/signup-new-coach', { user: signup });
      }
    } catch (err){
      console.log(err);
    }
  }

  async _confirmReturn(req, res){
    try{
      //remove unwanted input
      delete req.body.coach;
      delete req.body.team;

      req.body.saveType = "existing";
      req.body.type="rebbl";
      let user = await signupService.saveSignUp(req.user.name, req.body);


      res.render('signup/signup-confirmed-oi', {user: user});
      //res.redirect('/signup');
    } catch (err){
      console.log(err);
    }
  }

  async _confirmReroll(req, res){
    try{
      //remove unwanted input
      delete req.body.coach;

      req.body.saveType = "reroll";
      req.body.type="rebbl";
      let user = await signupService.saveSignUp(req.user.name, req.body);

      if (user.error){
        res.render('signup/signup-reroll', {user: user});
      } else {
        res.render('signup/signup-confirmed-greenhorn', {user: user});
        //res.redirect('/signup');
      }
    } catch (err){
      console.log(err);
    }
  }

  async _confirmNew(req, res){
    try {
      req.body.saveType = "new";
      req.body.type="rebbl";
      let user = await signupService.saveSignUp(req.user.name, req.body);

      if (user.error){
        res.render('signup/signup-new-coach', {user: user});
      } else {
        res.render('signup/signup-confirmed-greenhorn', {user: user});
        //res.redirect('/signup');
      }
    } catch (err){
      console.log(err);
    }
  }

  async _resign(req,res){
    try{
      await signupService.resign(req.user.name,"rebbl");
      res.redirect('/signup');
    } catch (err){
      console.log(err);
    }
  }

  /* greenhorn */
  async _signupGreenhornCup(req, res){
    try{

      let user = await signupService.getSignUp(req.user.name,"rebbl");

      res.render('signup/signup-confirmed-greenhorn', {user: user});
    } catch (err){
      console.log(err);
    }
  }

  async _confirmGreenhornCup(req, res){
    try{
      await signupService.saveGreenhornSignUp(req.user.name);

      res.redirect('/signup');
    } catch (err){
      console.log(err);
    }
  }

  async _resignGreenhornCup(req,res){
    try{
      await signupService.resignGreenhorn(req.user.name);
      res.redirect('/signup');
    } catch (err){
      console.log(err);
    }
  }

  /* open invitational */
  async _signupOpenInvitational(req, res){
    try{

      let user = await signupService.getSignUp(req.user.name,"rebbl");

      res.render('signup/signup-confirmed-oi', {user: user});
    } catch (err){
      console.log(err);
    }
  }
  
  async _confirmOpenInvitational(req, res){
    try{
      await signupService.saveOISignUp(req.user.name);

      res.redirect('/signup');
    } catch (err){
      console.log(err);
    }
  }

  async _resignOpenInvitational(req,res){
    try{
      await signupService.resignOI(req.user.name);
      res.redirect('/signup');
    } catch (err){
      console.log(err);
    }
  }

  
  /* rampup */  
  async _confirmRampup(req, res){
    try {
      req.body.saveType = "rampup";
      req.body.type ="rebbl";
      let user = await signupService.saveSignUp(req.user.name, req.body);

      if (user.error){
        res.render('signup/signup-rampup', {user: user});
      } else {
        res.redirect('/signup');
      }
    } catch (err){
      console.log(err);
    }
  }

  /* REBBRL */
  async _rebbrl(req, res){
    try {
      let signup = await signupService.getSignUp(req.user.name,"rebbrl");
      let account = await accountService.getAccount(req.user.name);

      if (!signup){
        if(account){
          res.render('signup/signup-new-coach-rebbrl', {user: {account: account}});
          //res.render('signup/signup-rampup', {user: {account: account}});
        } else {
          res.render('signup/signup-new-coach-rebbrl', {user: req.user.name});
          //res.render('signup/signup-rampup', {user: req.user.name});
        }
        return;
      }

      if(account){
        signup.account = account;
      }
      res.render('signup/signup-new-coach-rebbrl', {user: signup});

    } catch (err){
      console.log(err);
    }
  }

  async _confirmRebbrl(req, res){
    try {
      req.body.saveType = "new";
      req.body.type ="rebbrl";
      let user = await signupService.saveSignUp(req.user.name, req.body);

      if (user.error){
        res.render('signup/signup-new-coach-rebbrl', {user: user});
      } else {
        res.render('signup/signup-confirmed-rebbrl', {user: user});
      }
    } catch (err){
      console.log(err);
    }
  }

  async _resignRebbrl(req, res){
    try{
      await signupService.resign(req.user.name,"rebbrl");
      res.redirect('/signup');
    } catch (err){
      console.log(err);
    }    
  }

}

module.exports = Signup;
