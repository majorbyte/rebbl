'use strict';

const accountService = require('../../lib/accountService.js')
  , apiService = require('../../lib/apiService.js')
  , cyanideService = require('../../lib/CyanideService.js')
  , express = require('express')
  , util = require('../../lib/util.js')
  , signupService = require('../../lib/signupService.js');


class Signup{
  constructor(){
    this.router = express.Router();
    this.races = [
      {id:13,name:"Amazon"}
      ,{id:24,name:"Bretonnia"}
      ,{id:8,name:"Chaos"}
      ,{id:21,name:"ChaosDwarf"}
      ,{id:9,name:"DarkElf"}
      ,{id:2,name:"Dwarf"}
      ,{id:14,name:"ProElf"}
      ,{id:6,name:"Goblin"}
      ,{id:11,name:"Halfling"}
      ,{id:15,name:"HighElf"}
      ,{id:1,name:"Human"}
      ,{id:16,name:"Khemri"}
      ,{id:25,name:"Kislev"}
      ,{id:5,name:"Lizardman"}
      ,{id:17,name:"Necromantic"}
      ,{id:12,name:"Norse"}
      ,{id:18,name:"Nurgle"}
      ,{id:4,name:"Orc"}
      ,{id:19,name:"Ogre"}
      ,{id:3,name:"Skaven"}
      ,{id:10,name:"Undead"}
      ,{id:22,name:"UnderworldDenizens"}
      ,{id:20,name:"Vampire"}
      ,{id:7,name:"WoodElf"}
    ];
  }

  routesConfig(){
    
/*    this.router.get('/', async function(req, res){
      res.render('signup/closed');
    });
*/
/*
    this.router.post('/confirm-rampup',util.ensureLoggedIn, this._confirmRampup.bind(this));
*/
    this.router.get('/', util.ensureAuthenticated, this._getStatus);

/*    this.router.get('/change', util.ensureLoggedIn, this._changeSignup.bind(this));


    this.router.post('/resign', util.ensureAuthenticated, this._resign);

  
    this.router.get('/reroll', util.ensureAuthenticated, this._reroll);

    this.router.post('/confirm-existing',util.ensureAuthenticated, this._confirmReturn);

    //this.router.get('/signup-oi',util.ensureAuthenticated, this._signupOpenInvitational);

    this.router.get('/signup-greenhorn',util.ensureAuthenticated, this._signupGreenhornCup);

    this.router.post('/confirm-reroll', util.ensureAuthenticated, this._confirmReroll.bind(this));

    this.router.post('/confirm-new', util.ensureLoggedIn, this._confirmNew.bind(this));

    this.router.post('/confirm-greenhorn', util.ensureAuthenticated, this._confirmGreenhornCup);

    //this.router.post('/confirm-oi', util.ensureAuthenticated, this._confirmOpenInvitational);


    this.router.post('/resign-greenhorn', util.ensureAuthenticated, this._resignGreenhornCup);

    //this.router.post('/resign-oi', util.ensureAuthenticated, this._resignOpenInvitational);

    this.router.post('/confirm', util.ensureAuthenticated, this._checkConfirmation);

    
    
    this.router.get('/signups/rebbrl', util.cache(10*60), function(req,res){res.render('signup/signups');});
    */
    this.router.get('/signups', function(req,res){res.render('signup/signups', {url: ""});});
    this.router.get('/counter', async function(req, res){res.render('signup/counter');});
    
//    this.router.get('/rebbrl/college', util.ensureLoggedIn, this._college.bind(this));
    this.router.get('/rebbrl/college-reserves', util.ensureLoggedIn, this._collegeReserve.bind(this));
//    this.router.get('/rebbrl/minors', util.ensureLoggedIn, this._minors.bind(this));
   this.router.post('/confirm-new-rebbrl', util.ensureLoggedIn, this._confirmRebbrl.bind(this));
//    this.router.post('/resign-rebbrl', util.ensureLoggedIn, this._resignRebbrl);
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
      res.render('signup/overview', {signups:signups, user: user});
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
          res.render('signup/signup-new-coach', {user: {account: account}, teamName : user.teamName});
          //res.render('signup/signup-rampup', {user: {account: account}});
        } else {
          res.render('signup/signup-new-coach', {user: req.user.name, teamName : user.teamName});
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
      await signupService.saveSignUp(req.user.name, req.body);

      res.redirect('/signup');
    } catch (err){
      console.log(err);
    }
  }

  async _confirmReroll(req, res){
    try{
      //remove unwanted input
      let signup = req.body;

      delete signup.coach;

      signup.saveType = "reroll";
      signup.type="rebbl";

      let account = await accountService.getAccount(req.user.name);
      signup.coach = account.coach;

      let coachRecord = await this.getTeam(signup, req.app.locals.cyanideEnabled);
      coachRecord.account = account;

      if (coachRecord.error){
        res.render("signup/signup-reroll", {user:coachRecord} );
      } else{
        let user = await signupService.saveSignUp(req.user.name, req.body);

        if (user.error){
          res.render('signup/signup-reroll', {user: user});
        } else {
          res.render('signup/signup-confirmed-greenhorn', {user: user});
          //res.redirect('/signup');
        }
      }

    } catch (err){
      console.log(err);
    }
  }

  async _confirmNew(req, res){
    try {
      let signup = req.body;

      signup.saveType = "new";
      signup.type="rebbl";

      let account = await accountService.getAccount(req.user.name);
      signup.coach = account.coach;

      let coachRecord = await this.getTeam(signup, req.app.locals.cyanideEnabled);
      coachRecord.account = account;

      if (coachRecord.error){
        res.render("signup/signup-new-coach", {user:coachRecord} );
        return;
      }

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

      let signup = req.body;

      signup.saveType = "rampup";
      signup.type ="rebbl";

      let account = await accountService.getAccount(req.user.name);
      signup.coach = account.coach;

      let coachRecord = await this.getTeam(signup, req.app.locals.cyanideEnabled);
      coachRecord.account = account;

      if (coachRecord.error){
        res.render("signup/signup-rampup", {user:coachRecord} );
        return;
      }
      
      signup.coach = coachRecord.User;


      let user = await signupService.saveSignUp(req.user.name, signup);

      if (user.error){
        res.render('signup/signup-rampup', {user: user});
      } else {
        res.redirect('/signup');
      }
    } catch (err){
      console.log(err);
    }
  }


  async getTeam(signup, cyanideEnabled){
    let coach = await apiService.findCoach(signup.coach);
    let coachRecord = null;
    let error = {};
    if (coach.ResponseSearchCoach.Coaches !== ""){
      if (!Array.isArray(coach.ResponseSearchCoach.Coaches.DataUser))
        coach.ResponseSearchCoach.Coaches.DataUser =[coach.ResponseSearchCoach.Coaches.DataUser];

      coachRecord = coach.ResponseSearchCoach.Coaches.DataUser.find(x => x.User.localeCompare(signup.coach,undefined,{sensitivity:"base"}) === 0);
      if (!coachRecord) error.coach = `Coach ${signup.coach} does not exist.`;
    } 
    if (coach.ResponseSearchCoach.Coaches === "") error.coach = `Coach ${signup.coach} does not exist.`;
    
    let team;
    if (cyanideEnabled){
      team = await cyanideService.team({platform:"pc",name:signup.team});

      if (!team) error.team = `Team ${signup.team} not found.`;

      if (team && coachRecord && Number(coachRecord.IdUser) !== team.team.idcoach) error.team = `The team ${signup.team} does not belong to this coach.`;

      if (team){
        signup.teamCreated = team.team.created;
        signup.lastPlayed = team.team.datelastmatch;
        signup.race = this.races.find(x => x.id === team.team.idraces).name;
      }
    } else {
      if (coachRecord){
        const coach = await apiService.getCoachInfo(coachRecord.IdUser);

        if (!Array.isArray(coach.ResponseGetCoachOverview.Teams.Team))
          coach.ResponseGetCoachOverview.Teams.Team = [coach.ResponseGetCoachOverview.Teams.Team];

        team = coach.ResponseGetCoachOverview.Teams.Team.find(team => team.Row.Name.localeCompare(signup.team,undefined,{sensitivity:"base"}) === 0);
        if (!team) error.team = `Team ${signup.team} not found.`;
        else {
          signup.race = this.races.find(x => x.id === Number(team.Row.IdRaces)).name;

          const matches = await apiService.getTeamMatches(team.Row.ID.Value.replace(/\D/g,""));


          if (Number(matches.ResponseGetTeamMatchRecords.TotalRecords) === 0){
            signup.teamCreated = signup.lastPlayed = "A";
          } else {
            signup.teamCreated = "A";
            signup.lastPlayed = "B";
          }
        }
      }
    }

    if (error.team || error.coach) signup.error = error;

    return signup;
  }


  /* REBBRL */
  async _college(req, res){
    await this._rebbrl(req, res, "College");
  }

  async _collegeReserve(req, res){
    req.reserve = true;
    await this._rebbrl(req, res, "College");
  }

  async _minors(req, res){
    await this._rebbrl(req, res, "Minors");
  }

  async _rebbrl(req, res, league){
    try {
      let signup = await signupService.getSignUp(req.user.name,"rebbrl");
      let account = await accountService.getAccount(req.user.name);

      if (!signup){
        if(account){
          res.render('signup/signup-new-coach-rebbrl', {user: {account: account, league: league}, reserve: req.reserve});
        } else {
          res.render('signup/signup-new-coach-rebbrl', {user: req.user.name});
        }
        return;
      }

      if(account){
        signup.account = account;
        signup.league = league;
      }
      res.render('signup/signup-new-coach-rebbrl', {user: signup, reserve: req.reserve});

    } catch (err){
      console.log(err);
    }
  }

  async _confirmRebbrl(req, res){
    try {
      let signup = req.body;

      if (signup.reserve === "on") {
        signup.saveType = "reserve";
      } else {
        signup.saveType = "new";
      }
      signup.type ="rebbrl";

      let account = await accountService.getAccount(req.user.name);
      signup.coach = account.coach;

      let coachRecord = await this.getTeam(signup, req.app.locals.cyanideEnabled);
      coachRecord.account = account;

      if (coachRecord.error){
        res.render("signup/signup-new-coach-rebbrl", {user:coachRecord} );
        return;
      }

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
