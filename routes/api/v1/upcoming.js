"use strict";
const LeagueService = require("../../../lib/LeagueService.js")
  , apiService = require("../../../lib/apiService.js")
  , datingService = require("../../../lib/DatingService.js")
  , teamService = require("../../../lib/teamservice.js")
  , util = require("../../../lib/util.js")
  , express = require("express")
  , router = express.Router({mergeParams: true});


router.get("/", util.cache(10*60), async function(req, res){
    let n = await datingService.all();    
    let dates = [...new Set(n.map(date=> date.id))];

    let schedules = await LeagueService.searchLeagues({"contest_id":{$in:dates}});

    let clanSchedules = await LeagueService.searchLeagues({"matches.contest_id":{$in:dates}},{projection:{"matches.$":1}} );

    if(clanSchedules.length > 0){
        clanSchedules.map(x => x.matches.map(m => schedules.push(m)));
    }

    let data = [];

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
            homeTeamRace: match.opponents[0].team.race,
            homeTeamLogo: match.opponents[0].team.logo,
            awayCoach: match.opponents[1].coach.name,
            awayTeam: match.opponents[1].team.name,
            awayTeamValue: awayTeam ? awayTeam.team.nextMatchTV || awayTeam.team.value : match.opponents[1].team.value,
            awayTeamRace: match.opponents[1].team.race,
            awayTeamLogo: match.opponents[1].team.logo,
            match_uuid : match.match_uuid,
            contest_id: match.contest_id,
            league:match.league,
            competition:match.competition

        });

    }));


    res.send(data);
});

router.post("/stream/:contest_id", util.ensureAuthenticatedApi, async function(req, res){
    try{
        let date = await datingService.getDate(Number(req.params.contest_id));
        //let user = await accountService.getAccount(req.user.name);

        if(date && !date.stream){
            date.stream = {name: req.user.name, url:res.locals.user.twitch};
            datingService.update(date.id, date);
            res.status(200).send(date);
        } else {
            res.status(403).send();
        }
    } catch(ex){
        console.log(ex);
        res.status(500).send();
    }
});

router.post("/unstream/:contest_id", util.ensureAuthenticatedApi, async function(req, res){
    try{
        let date = await datingService.getDate(Number(req.params.contest_id));

        if(date && date.stream){
            delete date.stream;
            datingService.update(date.id, date);
            res.status(200).send(date);
        } else {
            res.status(403).send();
        }
    } catch(ex){
        console.log(ex);
        res.status(500).send();
    }
});

router.get("/ongoing", util.cache(60), async function(req,res){
    let data = await apiService.ongoingGames();

    let games = data.ResponseGetWatchableGames.WatchableGames.WatchGameData
        .filter(x => !["Coach-223805-fcf34d6c9c4a9da44c7f7364ac8a6abc", "Coach-7347-66aadca19a824db6e3460315b93c583f", "Coach-115814-1209f9b1791e5d035a28a849c1db4f8d"].includes(x.IdSession))
        .map(gamedata => {
            // eslint-disable-next-line no-unused-vars
            let {IdSession, Server, IdTeam1, IdTeam2, IsSSLWebsockets, ClientVersion, IsSSL,Port, ...game } = gamedata;
            return game;
        });

    res.json(games);
});


module.exports = router;