'use strict';

const bb3Service = require("../../lib/bb3Service.js");

const express = require("express")
, dataService = require("../../lib/DataServiceBB3.js").rebbl3
, datingService = require("../../lib/DatingService.js")
, redraft = require("./redraft.js")
, util = require("../../lib/util.js");

class BB3{
	constructor(){
		this.router = express.Router();
	}

  match = async (req,res) => {
    let match = await dataService.getMatch({gameId:req.params.id});
    if (!match) match = await dataService.getMatch({matchId:req.params.id});

    let schedule = null;
    // game is played, but not synced properly, show intermediate screen
    if (!match) schedule = await dataService.getSchedule({gameId:req.params.id}); 
    if (!schedule) schedule = await dataService.getSchedule({matchId:req.params.id}); 

    res.render("bb3/match", {match, schedule, user:res.locals.user});
      
  };
  competitions = async (req,res) => {
    const season = req.params.season || "season 3";
    const competitions = await dataService.getCompetitions({season, $or:[{format:2},{format:1},{format:3}],status:{$lt:5},leagueId:{$ne:"3c9429cd-b146-11ed-80a8-020000a4d571"}});
    res.render("bb3/competitions", {competitions})
  };
  competition = async (req,res) =>  {
    const competition = await dataService.getCompetition({id:req.params.competitionId});
    if (competition.format == 2) res.render("bb3/competition", {competition});
    else res.render("bb3/playoffs/knockout", {competition});
  }
  schedules = async (req,res) => {
    
    const competition = await dataService.getCompetition({id:req.params.competitionId},{projection:{id:1, name:1, day:1}})
    let schedules = await dataService.getSchedules({competitionId:req.params.competitionId});
    const name = new RegExp(`${competition.name} Swiss`,"i");
    const swissSchedules = await dataService.getSchedules({competitionName:name});

    for(const schedule of swissSchedules){
      schedule.round +=  competition.day;
      schedules.push(schedule);
    }

    res.render("bb3/schedules", {league:"REBBL", schedules, competition})
  }
  round = async (req,res) => res.render("bb3/schedules", {league:"REBBL", schedules:await dataService.getSchedules({competitionId:req.params.competitionId, round:Number(req.params.round)}), competition:await dataService.getCompetition({id:req.params.competitionId},{projection:{id:1, name:1, day:1}})});
  unplayed = async (req,res) => res.render("bb3/unplayed",{matches: await bb3Service.getUnplayedMatch(req.params.id)});

  validate = async (req,res, valid) => res.render("bb3/match", {match: await bb3Service.processMatch(req.params.id, res.locals.user, valid), user:res.locals.user});
  validateSchedule = async (req,res, valid) => res.render("bb3/match", {schedule: await bb3Service.processMatchBySchedule(req.params.id, res.locals.user, valid), user:res.locals.user});

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
      let contest = await dataService.getSchedule({"matchId":req.params.matchId});
      
      if(contest){
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
  };

  team = async (req,res) => {
    let team = await dataService.getTeam({id:req.params.id});
    if (!team){
      await bb3Service.getTeams([req.params.id]);
      team = await dataService.getTeam({id:req.params.id});
    } 
    const retiredPlayers = await dataService.getRetiredPlayers({teamId:req.params.id});
    const m = Array.isArray(team?.matches) ? team.matches : [];
    const matches = await dataService.getMatches({gameId:{$in:m}});

    const competition = await dataService.getCompetition({"standings.teamId":req.params.id});
    
    if (competition){
      const standing = competition.standings.find(x => x.teamId === req.params.id);

      if (standing) team.coachId = standing.id;
  
    }

    return res.render("bb3/fullTeam", {team, matches, retiredPlayers, user:res.locals.user});
  };

  retirePlayer = async (req,res)  => {  
    
    try{
      const result = await bb3Service.retirePlayer(res.locals.user, req.params.id, req.params.playerId);
      if (result) res.status(200).send();
      else res.status(400).send();
    } catch(e) {
      console.dir(e);
      res.status(500).send();
    }
    
  }


  routesConfig(){
    this.router.get("/", util.cache(1), util.checkAuthenticated, this.competitions);
    this.router.use("/redraft", new redraft().routesConfig());
    this.router.get("/competition/:competitionId", util.cache(1), util.checkAuthenticated, this.competition);
    this.router.get("/competition/:competitionId/schedules", util.cache(10*60), util.checkAuthenticated, this.schedules);
    this.router.get("/competition/:competitionId/schedules/:round", util.cache(10*60), util.checkAuthenticated, this.round);
    this.router.get("/team/:id", util.cache(/*10*60*/1), util.checkAuthenticated, this.team);
    this.router.get("/match/:id", util.cache(1), util.checkAuthenticated, this.match);
    this.router.get("/unplayed/:id", util.cache(10*60), util.checkAuthenticated, this.unplayed);

    this.router.post("/match/:id/validate", util.cache(1), util.ensureAuthenticated, async (req,res) => this.validate(req,res,true));
    this.router.post("/match/:id/invalidate", util.cache(1), util.ensureAuthenticated, async (req,res) => this.validate(req,res,false));
    this.router.post("/schedule/:id/validate", util.cache(1), util.ensureAuthenticated, async (req,res) => this.validateSchedule(req,res,true));
    this.router.post("/schedule/:id/invalidate", util.cache(1), util.ensureAuthenticated, async (req,res) => this.validateSchedule(req,res,false));

    this.router.put('/unplayed/:matchId/stream', util.checkAuthenticated, util.hasRole('streamer'), this.stream);
    this.router.put('/unplayed/:matchId/schedule', util.checkAuthenticated, util.ensureAuthenticated, this.scheduleMatch);

    this.router.post('/team/:id/retire/:playerId', util.ensureAuthenticated, this.retirePlayer)

    this.router.get('/:season', util.cache(1), util.checkAuthenticated, this.competitions)

    return this.router;
  }
}
module.exports = BB3;
