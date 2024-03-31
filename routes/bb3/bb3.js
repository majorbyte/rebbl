'use strict';

const bb3Service = require("../../lib/bb3Service.js");

const express = require("express")
, dataService = require("../../lib/DataServiceBB3.js").rebbl3
, util = require("../../lib/util.js");

class BB3{
	constructor(){
		this.router = express.Router();
	}

  match = async (req,res) => res.render("bb3/match", {match:await dataService.getMatch({matchId:req.params.id}), user:res.locals.user});
  competitions = async (req,res) => res.render("bb3/competitions", {competitions:await dataService.getCompetitions({format:2,status:{$lt:4},leagueId:{$ne:"3c9429cd-b146-11ed-80a8-020000a4d571"}})});
  competition = async (req,res) =>  res.render("bb3/competition", {competition:await dataService.getCompetition({id:req.params.competitionId})});
  schedules = async (req,res) => res.render("bb3/schedules", {league:"REBBL", schedules:await dataService.getSchedules({competitionId:req.params.competitionId}), competition:await dataService.getCompetition({id:req.params.competitionId},{projection:{id:1, name:1, day:1}}) });
  round = async (req,res) => res.render("bb3/schedules", {league:"REBBL", schedules:await dataService.getSchedules({competitionId:req.params.competitionId, round:Number(req.params.round)}), competition:await dataService.getCompetition({id:req.params.competitionId},{projection:{id:1, name:1, day:1}})});
  unplayed = async (req,res) => res.render("bb3/unplayed",{matches: await bb3Service.getUnplayedMatch(req.params.id)});

  validate = async (req,res) => res.render("bb3/match", {match: await bb3Service.validateMatch(req.params.id, res.locals.user), user:res.locals.user});

  standings = async (req,res) => res.render("bb3/standings", {rankings:await dataService.getRankings({competitionId:"2b791aa6-b14d-11ed-80a8-020000a4d571"})});
  rookieStandings = async (req,res) => res.render("bb3/standings", {rankings:await dataService.getRankings({competitionId:"5d031521-b151-11ed-80a8-020000a4d571"})});

  team = async (req,res) => {
    const team = await dataService.getTeam({id:req.params.id});
    const m = Array.isArray(team?.matches) ? team.matches : [];
    const matches = await dataService.getMatches({matchId:{$in:m}});
    return res.render("bb3/fullTeam", {team, matches, user:res.locals.user});
  };

  routesConfig(){
    this.router.get("/", util.cache(10*60), util.checkAuthenticated, this.competitions);
    this.router.get("/competition/:competitionId", util.cache(10*60), util.checkAuthenticated, this.competition);
    this.router.get("/competition/:competitionId/schedules", util.cache(10*60), util.checkAuthenticated, this.schedules);
    this.router.get("/competition/:competitionId/schedules/:round", util.cache(10*60), util.checkAuthenticated, this.round);
    this.router.get("/team/:id", util.cache(10*60), util.checkAuthenticated, this.team);
    this.router.get("/match/:id", util.cache(1), util.checkAuthenticated, this.match);
    this.router.get("/unplayed/:id", util.cache(10*60), util.checkAuthenticated, this.unplayed);
    
    this.router.post("/match/:id/validate", util.cache(1), util.ensureAuthenticated, this.validate);

    return this.router;
  }
}
module.exports = BB3;
