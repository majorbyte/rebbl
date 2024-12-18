'use strict';

const express = require("express")
, accountService = require('../../lib/accountService.js')
, registerDefaultRoutes = require("../default.js")
, util = require("../../lib/util.js");

class Clan{
	constructor(){
		this.router = express.Router();
	}

  _root(req,res){
    res.render("clan/index");
  }
  _standings(req,res){
    res.render("clan/standings");
  }
  async _clan(req,res){
    res.render("clan/clan",  {clan:req.params.clan, bb3:true})
  }
  async _seasonclan(req,res){
    res.render("clan/clan",  {clan:req.params.clan, season:req.params.season, bb3:req.params.season > "season 18"})
  }

  async _build(req,res){
    const account = await accountService.getAccount(req.user.name);
    if (account?.roles?.includes("clanadmin")) res.render("clan/build", {clan:req.params.clan});
    else res.render("clan/build");
  }

  _schedule(req,res){
    res.render("clan/schedule");
  }
  _matchup(req,res){
    res.render("clan/matchup",{bb3:req.params.season > "season 18"});
  }
  _template = (req,res) => res.render(`clan/templates/${req.params.template}`);

  routesConfig(){
    registerDefaultRoutes(this.router);

    //this.router.get("/build/:template", this._template); //this seems like an old thing not needed anymore

    this.router.use("/rebbl/match", (req,res) => res.redirect(302, "/" + req.originalUrl.split("/").slice(2).join("/")));
    this.router.get("/divisions", util.cache(600), this._root);
    this.router.get("/clan", util.cache(600), this._clan);
    this.router.get("/build",util.ensureAuthenticated, util.cache(1), this._build);
    this.router.get("/build/:clan",util.ensureAuthenticated, util.cache(1), this._build);
    this.router.get("/:clan",util.ensureAuthenticated, util.cache(600), this._clan);
    this.router.get("/season/:season/:clan", util.cache(600), this._seasonclan);
    this.router.get("/schedule/:s/:d", util.cache(600), this._schedule);
    this.router.get("/:season/:division/:round/:house", util.cache(600), this._matchup);
    
    this.router.use('~/team', require(`../team/team.js`));
    this.router.use('/match', require('../rebbl/match.js'));

    this.router.get("/", util.cache(2), this._standings);

    return this.router;
  }
}

module.exports = Clan;
