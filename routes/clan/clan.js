'use strict';

const express = require("express")
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
  _clan(req,res){
    res.render("clan/build");
  }
  _team(req,res){
    res.render("clan/team",{clan:"MAJOR", team:req.params.team});
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
    this.router.get("/clan/team",util.cache(2), this._team);
    this.router.get("/clan/team/:team",util.cache(2), this._team);
    this.router.get("/clan/:clan",util.cache(2), this._clan);
    this.router.get("/schedule/:s/:d",util.cache(2), this._schedule);
    this.router.get("/:season/:division/:round/:house",util.cache(2), this._matchup);
    
    this.router.get("/", util.cache(2), this._standings);

    return this.router;

  }

}



module.exports = Clan;
