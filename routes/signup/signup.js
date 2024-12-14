'use strict';

const { greenhorn } = require('../../lib/ConfigurationService.js');

const accountService = require('../../lib/accountService.js')
  , discordService = require('../../lib/DiscordService.js')
  , dataService = require('../../lib/DataServiceBB3.js').rebbl3
  , express = require('express')
  , util = require('../../lib/util.js')
  , signupService = require('../../lib/signupService.js')
  , bb3Service = require('../../lib/bb3Service.js')

const CLIENT_ID = process.env['discordClientId'];
const REDIRECT_URI = process.env['discordSignupCallbackURL'];


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

    const signupState = {
      mainOpen : false,
      greenhornOpen : false,
      ureOpen: false,
      collegeOpen: true
    }

    if (!signupState.mainOpen && !signupState.greenhornOpen && !signupState.ureOpen && !signupState.collegeOpen){
      this.router.get('/', async function(req, res){
        res.render('signup/closed');
      });
    }
   
    this.router.get('/discord', util.ensureAuthenticated, this._authDiscord);
    this.router.get('/nodiscord', util.ensureAuthenticated, this._noDiscord);

    this.router.get('/discord/callback', this._authDiscordCallback);

    if (signupState.mainOpen || signupState.collegeOpen)
      this.router.get('/', util.ensureAuthenticated, async (req,res) => this.#getStatus(req,res, signupState));

    if (signupState.collegeOpen){
      this.router.get('/rebbrl/college', util.ensureLoggedIn, this._college.bind(this));
      this.router.get('/rebbrl/college-reserves', util.ensureLoggedIn, this._collegeReserve.bind(this));
      
      this.router.post('/confirm-new-rebbrl', util.ensureLoggedIn, this._confirmRebbrl.bind(this));
      this.router.get('/rebbrl/minors', util.ensureLoggedIn, this._minors.bind(this));
      this.router.post('/resign-rebbrl', util.ensureLoggedIn, this._resignRebbrl);
    }

    if (signupState.mainOpen){
      this.router.get('/bb3/fresh', util.ensureLoggedIn, (req,res) => this.#changeSignupBB3(req,res,false,false));
      this.router.get('/bb3/returning', util.ensureLoggedIn, (req,res) => this.#changeSignupBB3(req,res,true,false));

      if (signupState.greenhornOpen) this.router.get('/bb3/greenhorn', util.ensureLoggedIn, (req,res) => this.#changeSignupBB3(req,res,false,true));
      if (signupState.ureOpen)this.router.get('/bb3/ure', util.ensureLoggedIn, (req,res) => this.#changeSignupBB3(req,res,true,true));
      
      this.router.post('/bb3/confirm', util.ensureLoggedIn, this.#confirmNewBB3.bind(this));
      this.router.post('/bb3/resign', util.ensureAuthenticated, this.#resignBB3);
    }

    this.router.get('/signups/rebbrl', util.cache(10*60), function(req,res){res.render('signup/signups');});
    this.router.get('/signups', util.cache(10*60), function(req,res){res.render('signup/bb3/signups');});
    this.router.get('/counter', async function(req, res){res.render('signup/counter');});


    this.router.get('/:slush', (req, res) => res.render('signup/closed'));

    return this.router;
  }

  async #getStatus(req, res, signupState){
    try{
      let user = await signupService.getExistingTeam(req.user.name);
      let signups = [];

      let signup = await signupService.getSignUp(req.user.name,"season 3");

      if (signup){
        signup.signedUp = true;
        signup.open = signupState.mainOpen;
        signups.push(signup);
      }

      if (signups.length === 0 && user) {
        user.signedUp = false;
      }

      let account = await accountService.getAccount(req.user.name);

      const lastSeasonTeam = await this.#getLastSeasonTeam(account.bb3id);

      res.render('signup/overview', {signups:signups, user: user, signupState,canReturn:lastSeasonTeam!= null, redrafted:lastSeasonTeam?.redraft?.status == "validated"});
    } catch (err){
      console.log(err);
    }
  }

  async #changeSignupBB3(req, res, returning, extra){
    let account = await accountService.getAccount(req.user.name);

    if (!account.bb3coach || account.bb3id.length < 1) return res.render('signup/bb3/fix-account');
  
    if (returning) {
      const competition = await dataService.getCompetition({"standings": {$elemMatch: {"id": account.bb3id, "team":{'$regex' : '^((?!\\[admin).)*$', '$options' : 'i'}}},season:"season 2"});

      if (!competition) return res.redirect("/signup");

      const standing = competition.standings.find(x => x.id === account.bb3id);

      const lastSeasonTeam = standing ? await dataService.getTeam({"id": standing.teamId}) : null;

      if (extra) {
        const races = await dataService.getRaces();
        lastSeasonTeam.race = races.find(x => x.code == lastSeasonTeam.race).data;
        return res.render('signup/bb3/signup-new-coach', {user: {account: account}, type:"ure", teams:[lastSeasonTeam]});
      }
      if (lastSeasonTeam?.redraft?.status == "validated" && !extra) {
        const races = await dataService.getRaces();
        lastSeasonTeam.race = races.find(x => x.code == lastSeasonTeam.race).data;
        return res.render('signup/bb3/signup-new-coach', {user: {account: account}, type:"returning", teams:[lastSeasonTeam]});
      }
  
      return res.redirect("/signup");
    }

    let teams = await bb3Service.searchTeams(account.bb3id, '%');
    teams = teams.filter(x => !x.experienced);

    res.render('signup/bb3/signup-new-coach', {user: {account: account}, type:extra?"greenhorn":"fresh", teams});
  }


  async #getLastSeasonTeam(coachId){
    const competition = await dataService.getCompetition({"standings": {$elemMatch: {"id": coachId, "team":{'$regex' : '^((?!\\[admin).)*$', '$options' : 'i'}}},season:"season 2"});
    if (!competition) return null;
    const standing = competition.standings.find(x => x.id === coachId);
    return standing ? await dataService.getTeam({"id": standing.teamId}) : null;
  }

  async #confirmNewBB3(req,res){
    try {
      let signup = {
        team: {
          id: req.body.id,
          value: Number(req.body.value),
          race:req.body.race,
          name: req.body.name,
        },
        type:req.body.type,
        league: req.body.league
      };

      const team = await dataService.getTeam({id: signup.team.id});

      signup.saveType = (team && team.redraft) ? "returning" : "new";

      let account = await accountService.getAccount(req.user.name);
      signup.coach = account.bb3coach;
      signup.coachId = account.bb3id;
      signup.reddit = account.reddit;
      signup.timezone = account.timezone

      await signupService.saveSignUpBB3(signup);

      res.redirect('/signup');
    } catch (err){
      console.log(err);
    }
  }
  async #resignBB3(req,res){
    try{
      await signupService.resign(req.user.name,"season 3");
      await signupService.resign(req.user.name,"season 3");
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
      let signup = await signupService.getSignUp(req.user.name,"college");
      let account = await accountService.getAccount(req.user.name);

      if (!account.bb3coach) {
        res.render('signup/bb3/fix-account');
      } else {
        let teams = await bb3Service.searchTeams(account.bb3id, '%');
        teams = teams.filter(x => !x.experienced);
  
        res.render('signup/bb3/signup-new-coach', {user: {account: account}, teams, rookie:true});
      }
  

       if (!signup){
         if(account){
           res.render('signup/signup-new-coach-rebbrl', {user: {account: account, league: league}, reserve: req.reserve});
         } else {
           res.render('signup/signup-new-coach-rebbrl', {user: req.user.name});
         }
         return;
       }

      // if(account){
      //   signup.account = account;
      //   signup.league = league;
      // }
      // res.render('signup/signup-new-coach-rebbrl', {user: signup, reserve: req.reserve});

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
      signup.type ="college";

      let account = await accountService.getAccount(req.user.name);
      signup.coach = account.bb3coach;
      signup.coachId = account.bb3id;

      signup.reddit = account.reddit;

      signup.team = {
        id: req.body.id,
        value: Number(req.body.value),
        race:req.body.race,
        name: req.body.name,
      };

      let user = await signupService.saveSignUpBB3Rookies(signup);

      if (user.error){
        res.render('signup/signup-new-coach-rebbrl', {user});
      } else {
        res.render('signup/signup-confirmed-rebbrl', {user,account});
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

  async _authDiscord(req, res, next){
    if (CLIENT_ID) {
      res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&scope=identify&response_type=code&redirect_uri=${REDIRECT_URI}`);
    }
  }

  async _authDiscordCallback(req,res){
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
    res.redirect('/signup');
  }

  async _noDiscord(req, res) {
    try {
      let account = res.locals.user;
      account.discordId = undefined;
      account.discord = undefined;
      account.discordOptedOut = true;
      await accountService.updateAccount(account);
      res.redirect('/signup');
    } catch(err) {
      console.log(err);
    }
  }

}

module.exports = Signup;
