'use strict';

const bb3Service = require("../../lib/bb3Service.js");

const express = require("express")
, dataService = require("../../lib/DataServiceBB3.js").rebbl3
, datingService = require("../../lib/DatingService.js")
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

  scheduleMatch = async function(req, res){
    try{
      let contest = await dataService.getSchedule({"matchId":req.params.matchId});
      
      if(contest && (contest.away.coach.id === res.locals.user.bb3id || contest.home.coach.id === res.locals.user.bb3id)){
        if (req.body.date && req.body.date.length === 16)
          datingService.updateDate(req.params.matchId, req.body.date);
        else 
          datingService.removeDate(req.params.matchId);
        res.send("ok");
      } else {
        res.status(403).send();
      }
    } catch(err){
      console.log(err);
    }
  }

  stream = async function(req, res){
    try{
      let contest = [];
      contest = await leagueService.searchLeagues({"contest_id":Number(req.params.match_id) });
      if (contest.length === 0) contest = await dataService.getSchedule({matchId:req.params.match_id});
      
      if(contest.length > 0){
        if (req.body.date && req.body.date.length === 16)
          datingService.updateDate(Number(req.params.match_id == 0 ? req.body.competitionId : req.params.match_id), req.body.date);
        else 
          datingService.removeDate(Number(req.params.match_id == 0 ? req.body.competitionId : req.params.match_id));
        res.send("ok");
      } else {
        res.status(403).send();
      }
    } catch(err){
      console.log(err);
    }
  };

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

    this.router.put('/unplayed/:matchId/stream', util.checkAuthenticated, util.hasRole('streamer'), this.stream);
    this.router.put('/unplayed/:matchId/schedule', util.checkAuthenticated, util.ensureAuthenticated, this.scheduleMatch);

    return this.router;
  }
}
module.exports = BB3;
