'use strict';

const bb3Service = require("../../lib/bb3Service.js");

const express = require("express")
, oldService = require("../../lib/DataService.js").rebbl
, dataService = require("../../lib/DataServiceBB3.js").rebbl3
, datingService = require("../../lib/DatingService.js")
, redraft = require("./redraft.js")
, util = require("../../lib/util.js");

class BB3{
	constructor(){
		this.router = express.Router();
	}

  #starplayers = async (_,res) => res.render("bb3/starplayers"); 

  #match = async (req,res) => {
    let match = await dataService.getMatch({gameId:req.params.id});
    if (!match) match = await dataService.getMatch({matchId:req.params.id});

    let schedule = null;
    // game is played, but not synced properly, show intermediate screen
    if (!match) schedule = await dataService.getSchedule({gameId:req.params.id}); 
    if (!schedule) schedule = await dataService.getSchedule({matchId:req.params.id}); 

    res.render("bb3/match", {match, schedule, user:res.locals.user});
      
  };
  #competitions = async (req,res) => {
    const season = req.params.season || "season 3";
    const competitions = await dataService.getCompetitions({season, $or:[{format:2},{format:1},{format:3}],status:{$lt:5},leagueId:{$ne:"3c9429cd-b146-11ed-80a8-020000a4d571"}});
    res.render("bb3/competitions", {competitions})
  };
  #competition = async (req,res) =>  {
    const competition = await dataService.getCompetition({id:req.params.competitionId});
    if (competition.format == 1) return res.render("bb3/playoffs/knockout", {competition});

    res.render("bb3/competition", {competition});
  }
  #standings = async (req,res) =>  {
    let competition = await dataService.getCompetition({id:req.params.competitionId});
    if (competition.excludeRedraft) competition = await dataService.getCompetition({name:competition.name.replace(/ R\d/, ""), excludeRedraft:false});
    res.render("bb3/competitions", {competitions:[competition]});
  }
  #schedules = async (req,res) => {
    
    const competition = await dataService.getCompetition({id:req.params.competitionId},{projection:{id:1, name:1, day:1}})
    let schedules = await dataService.getSchedules({competitionId:req.params.competitionId});
    const name = new RegExp(`${competition.name} Swiss`,"i");
    let swissSchedules = await dataService.getSchedules({competitionName:name});

    for(const schedule of swissSchedules){
      schedule.round +=  competition.day;
      schedules.push(schedule);
    }
    
    swissSchedules = await dataService.getSchedules({competitionName:new RegExp(`${competition.name} R`), season:competition.season});

    for(const schedule of swissSchedules){
      schedule.round = Number(schedule.competitionName.split(" R")[1]);
      schedules.push(schedule);
    }

    res.render("bb3/schedules", {league:"REBBL", schedules, competition})
  }
  #round = async (req,res) => {
    let schedules  = await dataService.getSchedules({competitionId:req.params.competitionId, round:Number(req.params.round)});
    let competition = await dataService.getCompetition({id:req.params.competitionId},{projection:{id:1, name:1, day:1,season:1}});

    if (schedules.length === 0) {
      const name = `${competition.name} R${req.params.round}`;
      const swissCompetition = await dataService.getCompetition({season:competition.season,name},{projection:{id:1, name:1, day:1}});
      if (!swissCompetition) return res.render("bb3/schedules", {league:"REBBL", schedules , competition});
        
      schedules  = await dataService.getSchedules({competitionId:swissCompetition.id, round:1});
      schedules.forEach(x => x.round = Number(req.params.round));
    }
    res.render("bb3/schedules", {league:"REBBL", schedules , competition});
  }
  #unplayed = async (req,res) => res.render("bb3/unplayed",{matches: await bb3Service.getUnplayedMatch(req.params.id)});

  #validate = async (req,res, valid) => res.render("bb3/match", {match: await bb3Service.processMatch(req.params.id, res.locals.user, valid), user:res.locals.user});
  #validateSchedule = async (req,res, valid) => res.render("bb3/match", {schedule: await bb3Service.processMatchBySchedule(req.params.id, res.locals.user, valid), user:res.locals.user});

  #scheduleMatch = async function(req, res){
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

  #stream = async function(req, res){
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

  #team = async (req,res) => {
    let team = await res.locals.profiler.measure("retrieving team","database", dataService.getTeam({id:req.params.id}));

    if (!team){
      await bb3Service.getTeams([req.params.id]);
      team = await dataService.getTeam({id:req.params.id});
    } 
    const m = Array.isArray(team?.matches) ? team.matches : [];

    const [retiredPlayers,matches] = await res.locals.profiler.measure("retrieving retiredplayers & matches","database", Promise.all([
      dataService.getRetiredPlayers({teamId:req.params.id}),
      dataService.getMatches({gameId:{$in:m}},{homeScore:1,awayScore:1,homeGamer:1,awayGamer:1,"homeTeam.roster.casualties":1})
    ]));
      
    return res.render("bb3/fullTeam", {team, matches, retiredPlayers, user:res.locals.user});
  };

  #retirePlayer = async (req,res)  => {  
    
    try{
      const result = await bb3Service.retirePlayer(res.locals.user, req.params.id, req.params.playerId);
      if (result) res.status(200).send();
      else res.status(400).send();
    } catch(e) {
      console.dir(e);
      res.status(500).send();
    }
    
  }

  #landingPage = async(req,res) => {
    const season = req.params.season || "season 3";
    const competitions = await dataService.getCompetitions({season, $or:[{format:2},{format:1},{format:3}],status:{$lt:5},leagueId:{$ne:"3c9429cd-b146-11ed-80a8-020000a4d571"}});

    let competition;
    let upcomingMatch;
    if (res.locals.user) {
      //competition = competitions.find(x => x.standings.some(coach => coach.id === res.locals.user.bb3id ));
      competition = competitions.filter(x => x.standings.some(coach => coach.id === res.locals.user.bb3id ) && x.status < 4).pop();
      if (res.locals.user.bb3id) upcomingMatch = await bb3Service.getUpcomingMatch(null, res.locals.user.bb3id);
    }
    if (!competition) competition = competitions[Math.floor(Math.random()*competitions.length)];

    const announcements = await oldService.getAnnouncements({});
    
    res.render("bb3/landingpage", {competition,upcomingMatch,announcements: announcements.sort((a,b) => b.date-a.date).slice(0,5)})
  }

  #coach = async (req,res) => {
    
    const teams = await res.locals.profiler.measure("Team Info","database",  dataService.getTeams({"coach.id":req.params.id,zfl:{$ne:true}},{matches:1,logo:1,race:1,name:1,value:1}));

    const matchIds = teams.reduce((p,c) => p.concat(c.matches)  ,[]).sort((a,b) => util.getDateFromUUID(b) - util.getDateFromUUID(a)).splice(0,3);
    
    let matches = await res.locals.profiler.measure("Team Info","database", dataService.getMatches({gameId:{$in:matchIds}},{gameId:1, homeScore:1,awayScore:1,homeGamer:1,awayGamer:1,"homeTeam.roster.casualties":1}));

    matches = matches.sort((a,b) => util.getDateFromUUID(b.gameId) - util.getDateFromUUID(a.gameId));

    return res.render("bb3/coachNew", {coach: await oldService.getAccount({$or:[{bb3id:req.params.id},{bb3coach:req.params.id}]}),matches})
  }; 
  #coachMatches = async(req,res) => isNaN(req.params.id) 
    ? res.render("bb3/coach", {coach: await oldService.getAccount({bb3id:req.params.id})})
    : res.redirect(302, `${req.protocol}://bb2.${req.get("host")}${req.originalUrl}`);

  routesConfig(){
    this.router.get("/",  this.#landingPage);
    this.router.use("/standings", this.#competitions);
    this.router.use("/starplayers", this.#starplayers);
    this.router.use("/redraft", new redraft().routesConfig());
    this.router.get("/competition/:competitionId",  this.#competition);
    this.router.get("/competition/:competitionId/standings",  this.#standings);
    this.router.get("/competition/:competitionId/schedules",  this.#schedules);
    this.router.get("/competition/:competitionId/schedules/:round",  this.#round);
    this.router.get("/team/:id",  this.#team);
    this.router.get("/match/:id",  this.#match);
    this.router.get("/unplayed/:id",  this.#unplayed);

    this.router.get('/coach/:id', this.#coach);
    this.router.get('/coach/:id/details', (req,res) => res.redirect(302, `${req.protocol}://bb2.${req.get("host")}${req.originalUrl}`) );
    this.router.get('/coach/:id/matches', this.#coachMatches);


    this.router.post("/match/:id/validate", util.ensureAuthenticated, async (req,res) => this.#validate(req,res,true));
    this.router.post("/match/:id/invalidate", util.ensureAuthenticated, async (req,res) => this.#validate(req,res,false));
    this.router.post("/schedule/:id/validate", util.ensureAuthenticated, async (req,res) => this.#validateSchedule(req,res,true));
    this.router.post("/schedule/:id/invalidate", util.ensureAuthenticated, async (req,res) => this.#validateSchedule(req,res,false));

    this.router.put('/unplayed/:matchId/stream',  util.hasRole('streamer'), this.#stream);
    this.router.put('/unplayed/:matchId/schedule',  util.ensureAuthenticated, this.#scheduleMatch);

    this.router.post('/team/:id/retire/:playerId', util.ensureAuthenticated, this.#retirePlayer)


    this.router.get('/:season',  this.#competitions)

    return this.router;
  }
}
module.exports = BB3;
