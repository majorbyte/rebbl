'use strict';

const express = require("express")
, accountService = require('../../lib/accountService.js')
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
    res.render("clan/clan",  {clan:req.params.clan})
  }
  async _seasonclan(req,res){
    res.render("clan/clan",  {clan:req.params.clan, season:req.params.season})
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
    res.render("clan/matchup");
  }
  _template = (req,res) => res.render(`clan/templates/${req.params.template}`);

  routesConfig(){
    this.router.get("/build/:template", this._template);
    this.router.get("/divisions",util.cache(2), this._root);
    this.router.get("/clan",util.cache(2), this._clan);
    this.router.get("/clan/build",util.ensureAuthenticated, util.cache(2), this._build);
    this.router.get("/clan/build/:clan",util.ensureAuthenticated, util.cache(2), this._build);
    this.router.get("/clan/:clan",util.ensureAuthenticated, util.cache(2), this._clan);
    this.router.get("/clan/season/:season/:clan",util.cache(2), this._seasonclan);    
    this.router.get("/schedule/:s/:d",util.cache(2), this._schedule);
    this.router.get("/:season/:division/:round/:house",util.cache(2), this._matchup);
    
    this.router.get("/", util.cache(2), this._standings);

    return this.router;

  }

}



module.exports = Clan;
