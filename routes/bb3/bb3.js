'use strict';

const express = require("express")
, dataService = require("../../lib/DataServiceBB3.js").rebbl3
, util = require("../../lib/util.js");

class BB3{
	constructor(){
		this.router = express.Router();
	}

  match = async (req,res) => res.render("bb3/match", {match:await dataService.getMatch({matchId:req.params.id})});
  competitions = async (req,res) => res.render("bb3/competitions", {competitions:await dataService.getCompetitions({format:2,status:{$lt:4}})});
  schedules =async (req,res) => res.render("bb3/schedules", {league:"REBBL", schedules:await dataService.getSchedules({competitionId:req.params.competitionId})})
  standings = async (req,res) => res.render("bb3/standings", {rankings:await dataService.getRankings({competitionId:"2b791aa6-b14d-11ed-80a8-020000a4d571"})});
  rookieStandings = async (req,res) => res.render("bb3/standings", {rankings:await dataService.getRankings({competitionId:"5d031521-b151-11ed-80a8-020000a4d571"})});

  team = async (req,res) => {
    const team = await dataService.getTeam({id:req.params.id});
    const m = Array.isArray(team?.matches) ? team.matches : [];
    const matches = await dataService.getMatches({matchId:{$in:m}});
    return res.render("bb3/fullTeam", {team, matches, user:res.locals.user});
  };

  routesConfig(){
    this.router.get("/", util.cache(1), util.checkAuthenticated, this.competitions);
    this.router.get("/competition/:competitionId", util.cache(1), util.checkAuthenticated, this.schedules);
    //this.router.get("/rookies", util.cache(1), util.checkAuthenticated, this.rookieStandings);
    this.router.get("/team/:id", util.cache(1), util.checkAuthenticated, this.team);
    this.router.get("/match/:id", util.cache(1), util.checkAuthenticated, this.match);

    return this.router;
  }
}
module.exports = BB3;
