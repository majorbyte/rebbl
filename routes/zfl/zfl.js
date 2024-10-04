'use strict';

const express = require("express")
, passport = require("passport")
, accountService = require("../../lib/accountService.js")
, dataService = require("../../lib/DataServiceBB3.js").rebbl3
, util = require("../../lib/util.js");

class ZFL{
	constructor(){
		this.router = express.Router();

    this.router.use((req, res, next) => { res.locals.user = req.isAuthenticated() ? req.user : null; return next();});


    this.router.get("/login", passport.authenticate("discord"));
    this.router.get("/logout", (req, res) => {req.logout(null, _ => _);res.redirect("/");});

    this.router.get('/discord/callback',
      passport.authenticate('discord', {failureRedirect: '/login'}), async (req, res) =>  await this.#loginSucces(req.user,res) // auth success
    );

    this.router.get("/", async (_,res) => res.render("zfl/standings" , {competitions:await dataService.getZFLCompetitions({year:2494})} ) );

    this.router.get("/account", this.#checkAuth, this.#getAccount );
    this.router.get("/profile/:id", this.#getProfile );

    this.router.get("/standings", util.cache(1), async (_,res) => res.render("zfl/standings" , {competitions:await dataService.getZFLCompetitions({})} ) );
    this.router.get('/fixtures', util.cache(1), async (_,res) => res.render("zfl/fixtures" , {competitions:await dataService.getZFLCompetitions({year:2494}) }) );

    this.router.get('/api/bb3/:name', this.#ensureLoggedIn, async (req,res) => res.json(await accountService.getBB3Account(req.params.name)));
    this.router.patch('/api/account/bb3', this.#ensureLoggedIn, this.#updateCoach);
    this.router.patch('/api/account/zfl', this.#ensureLoggedIn, this.#updateZflName);
    this.router.patch('/api/team/:id/kit', this.#ensureLoggedIn, this.#updateKit);

  }

  #checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.status(401).send();
  }

  #ensureLoggedIn(req,res,next){
    try{
      if (res.locals.user && res.locals.user.username) { return next(); }
      req.session.returnUrl = req.originalUrl;
      res.redirect("/account/login");
    }
    catch(ex){
      console.log(ex.message);
      console.log(ex.stack);
    }
  }

  async #loginSucces(user,res){
    res.redirect('/account');
  }

  async #getAccount(_,res){
    let account = await dataService.getZFLAccount({id:res.locals.user.id});
    if (!account){
      account = {
        id: res.locals.user.id,
        username: res.locals.user.username,
        coach: null,
        zflCoachName: null,
        bio:"",
        teamId: null,
        roles:[]
      } 
      dataService.insertZFLAccount(account);
    }
    let team = null
    if (account.teamId){
      team = await dataService.getZFLTeam({id:account.teamId},{projection:{roster:0}});
    }
    res.render("zfl/account" , {account,team} );
  }

  async #getProfile(req,res){
    let account = await dataService.getZFLAccount({"coach.id":req.params.id});
    let team = null;
    if (account.teamId){
      team = await dataService.getZFLTeam({id:account.teamId},{projection:{roster:0}});
    }

    res.render("zfl/profile" , {account, team} );
  }


  async #updateKit(req,res){
    const data = {
      homeKit1: req.body.homeKit1,
      homeKit2: req.body.homeKit2,
      homeKit3: req.body.homeKit3,
      awayKit1: req.body.awayKit1,
      awayKit2: req.body.awayKit2,
      awayKit3: req.body.awayKit3,
    }
    await dataService.updateZFLTeam({id:req.params.id},{$set:{kit:data}});
    res.status(200).send();
  }

  async #updateCoach(req,res) {
    await dataService.updateZFLAccount({id:req.user.id},{$set:{coach:{id:req.body.id, name:req.body.name, service:req.body.service, displayId:req.body.displayId}}});
    res.status(200).send();
  }
  async #updateZflName(req,res) {
    await dataService.updateZFLAccount({id:req.user.id},{$set:{bio:req.body.bio, zflCoachName:req.body.zflCoachName}});
    res.status(200).send();
  }

}
module.exports = new ZFL();
