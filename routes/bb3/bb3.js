'use strict';

const express = require("express")
, dataService = require("../../lib/DataServiceBB3.js").rebbl3
, util = require("../../lib/util.js");

class BB3{
	constructor(){
		this.router = express.Router();
	}

  match = async (req,res) => res.render("bb3/match", {match:await dataService.getMatch({matchId:req.params.id})});
  standings = async (req,res) => res.render("bb3/standings", {rankings:await dataService.getRankings({})});

  team = async (req,res) => {
    const team = await dataService.getTeam({id:req.params.id});
    const matches = await dataService.getMatches({matchId:{$in:team.matches}});
    return res.render("bb3/fullTeam", {team, matches, user:res.locals.user});
  };

  routesConfig(){
    this.router.get("/", util.cache(1), util.checkAuthenticated, this.standings);
    this.router.get("/team/:id", util.cache(1), util.checkAuthenticated, this.team);
    this.router.get("/match/:id", util.cache(1), util.checkAuthenticated, this.match);

    return this.router;
  }
}
module.exports = BB3;
