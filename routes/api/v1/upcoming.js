"use strict";
const LeagueService = require("../../../lib/LeagueService.js")
  , dataService = require("../../../lib/DataService.js").rebbl
  , dataServiceBB3 = require("../../../lib/DataServiceBB3.js").rebbl3
  , datingService = require("../../../lib/DatingService.js")
  , teamService = require("../../../lib/teamservice.js")
  , util = require("../../../lib/util.js")
  , express = require("express")
  , router = express.Router({mergeParams: true});


router.get("/", util.cache(10*60), async function(req, res){
    let n = await datingService.all();    


    const now = new Date(Date.now());
    now.setHours(now.getHours()-4);
    let dates = [...new Set(n.filter(a => new Date(a.date) > now ).map(date=> date.id))];

    let schedules = await LeagueService.searchLeagues({"contest_id":{$in:dates}});

    let clanSchedules = await LeagueService.searchLeagues({"matches.contest_id":{$in:dates}},{projection:{"matches.$":1}} );
    let unstartedSchedules = await LeagueService.searchLeagues({"unstarted.competitionId":{$in:dates}},{projection:{"unstarted.$":1}} );


    if(clanSchedules.length > 0){
        clanSchedules.map(x => x.matches.map(m => schedules.push(m)));
    }
    if(unstartedSchedules.length > 0){
      let u = unstartedSchedules[0].unstarted[0];
      schedules.push({
        league:"Clan",
        clan:true,
        contest_id:u.competitionId,
        competition:u.competitionName,
        competition_id:u.competitionId,
        round:u.competitionName.replace(/\D/g,"")[1],
        opponents:[{
          coach:{
            id:u.coaches[0].coachId,
            name:u.coaches[0].coachName
          },
          team:{
            id:u.coaches[0].teamId,
            name:u.coaches[0].teamName,
            logo:u.coaches[0].logo
          }
        },{
          coach:{
            id:u.coaches[1].coachId,
            name:u.coaches[1].coachName
          },
          team:{
            id:u.coaches[1].teamId,
            name:u.coaches[1].teamName,
            logo:u.coaches[1].logo
          }
        }]
      });
  }

    let data = [];
    let races =  await dataService.getRaces();
    
    await Promise.all(schedules.map(async function(match) {
        let date = n.find(s => s.id === match.contest_id);

        let homeTeam = await teamService.getTeamById(match.opponents[0].team.id);
        let awayTeam = await teamService.getTeamById(match.opponents[1].team.id);
        
        if(!homeTeam || !awayTeam) return;

        data.push({
            scheduledDate : date.date,
            stream: date.stream,
            homeCoach: match.opponents[0].coach.name,
            homeTeam: match.opponents[0].team.name,
            homeTeamValue: homeTeam ? homeTeam.team.nextMatchTV || homeTeam.team.value : match.opponents[0].team.value,
            homeTeamRace: match.opponents[0].team.race || races.find(x => x.id === homeTeam.team.idraces).name,
            homeTeamLogo: match.opponents[0].team.logo,
            awayCoach: match.opponents[1].coach.name,
            awayTeam: match.opponents[1].team.name,
            awayTeamValue: awayTeam ? awayTeam.team.nextMatchTV || awayTeam.team.value : match.opponents[1].team.value,
            awayTeamRace: match.opponents[1].team.race || races.find(x => x.id === awayTeam.team.idraces).name ,
            awayTeamLogo: match.opponents[1].team.logo,
            match_uuid : match.match_uuid,
            contest_id: match.contest_id,
            league:match.league,
            competition:match.competition

        });

    }));

    // bb3
    schedules = await dataServiceBB3.getSchedules({"matchId":{$in:dates}});

    const getRace = function(raceId){
      switch (raceId){
        case 1: return "Human";
        case 2: return "Dwarf";
        case 3: return "Skaven";
        case 4: return "Orc";
        case 5: return "Lizardman";
        case 6: return "Goblin";
        case 7: return "Wood Elf";
        case 8: return "Chaos Chosen";
        case 9: return "Dark Elf";
        case 10: return "Shambling Undead";
        case 11: return "Halfling";
        case 14: return "Elven Union";
        case 17: return "Necromantic Horror";
        case 18: return "Nurgle";
        case 22: return "Underworld Denizen";
        case 23: return "Khorne";
        case 24: return "Imperial Nobility";
        case 29: return "Slaanesh";
        case 1000: return "Black Orc";
        case 1001: return "Chaos Renegade";
        case 1002: return "OldWorld Alliance";
        case 1004: return "Tzeentch";
        default: return `${raceId} unknown`;
      }
    }
  

    for(const match of schedules){
      let date = n.find(s => s.id === match.matchId);

      data.push({
        scheduledDate : date.date,
        stream: date.stream,
        homeCoach: match.home.coach.name,
        homeTeam: match.home.team.name,
        homeTeamValue: match.home.team.valueWithJourneymen / 1000,
        homeTeamRace: getRace(match.home.team.race),
        homeTeamLogo: match.home.team.logo,
        awayCoach: match.away.coach.name,
        awayTeam: match.away.team.name,
        awayTeamValue: match.away.team.valueWithJourneymen / 1000,
        awayTeamRace: getRace(match.away.team.race),
        awayTeamLogo: match.away.team.logo,
        match_uuid : match.matchId,
        contest_id: match.matchId,
        league:'ReBBL - BB3',
        competition:''

      });

    }

    res.send(data);
});

router.post("/stream/:contest_id", util.ensureAuthenticatedApi, async function(req, res){
    try{
        let date = isNaN(req.params.contest_id) 
          ? await datingService.getDate(req.params.contest_id) 
          : await datingService.getDate(Number(req.params.contest_id));
        //let user = await accountService.getAccount(req.user.name);

        if(date && !date.stream){
            date.stream = {name: req.user.name, url:res.locals.user.twitch};
            datingService.update(date.id, date,{upsert:true});
            res.status(200).send(date);
        } else {
            res.status(403).send();
        }
    } catch(ex){
        console.log(ex);
        res.status(500).json();
    }
});

router.post("/unstream/:contest_id", util.ensureAuthenticatedApi, async function(req, res){
    try{
      let date = isNaN(req.params.contest_id) 
        ? await datingService.getDate(req.params.contest_id) 
        : await datingService.getDate(Number(req.params.contest_id));

        if(date && date.stream){
            datingService.update(date.id, {$unset:{stream:""}});
            res.status(200).json(date);
        } else {
            res.status(403).json();
        }
    } catch(ex){
        console.log(ex);
        res.status(500).json();
    }
});

router.get("/ongoing", util.cache(60), async function(req,res){
    res.json([]);
});


module.exports = router;