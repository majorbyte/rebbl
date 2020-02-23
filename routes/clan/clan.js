'use strict';

const express = require("express")
, util = require("../../lib/util.js");

class Clan{
	constructor(){
		this.router = express.Router();
	}



  async _root(req,res){
    res.render("clan/index");
  }
  async _standings(req,res){
    res.render("clan/standings");
  }
  async _clan(req,res){
    res.render("clan/clan");
  }
  async _schedule(req,res){
    res.render("clan/schedule");
  }
  async _matchup(req,res){
    res.render("clan/matchup");
  }

  routesConfig(){
    this.router.get("/divisions",util.cache(2), this._root);
    this.router.get("/clan",util.cache(2), this._clan);
    this.router.get("/clan/:clan",util.cache(2), this._clan);
    this.router.get("/schedule/:s/:d",util.cache(2), this._schedule);
    this.router.get("/:season/:division/:round/:house",util.cache(2), this._matchup);
    
    this.router.get("/", util.cache(2), this._standings);

    return this.router;

  }

}



module.exports = Clan;