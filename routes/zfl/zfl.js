'use strict';

const express = require("express")
, passport = require("passport")
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

    this.router.get("/account", async (_,res) => res.render("zfl/account" , {} ) );

    this.router.get("/standings", util.cache(1), async (_,res) => res.render("zfl/standings" , {competitions:await dataService.getZFLCompetitions({})} ) );
    this.router.get('/fixtures', util.cache(1), async (_,res) => res.render("zfl/fixtures" , {competitions:await dataService.getZFLCompetitions({year:2494}) }) );
  }

  async #loginSucces(user,res){
    res.redirect('/');
  }

}
module.exports = new ZFL();
