"use strict";
const LeagueService = require("../../../lib/LeagueService.js")
  , accountService = require("../../../lib/accountService.js")
  , datingService = require("../../../lib/DatingService.js")
  , util = require("../../../lib/util.js")
  , express = require("express")
  , router = express.Router({mergeParams: true});


router.get("/", util.checkCache, async function(req, res){
    let n = await datingService.all();    
    let dates = [...new Set(n.map(date=> date.id))];

    let schedules = await LeagueService.searchLeagues({"contest_id":{$in:dates}});

    let data = [];

    schedules.map(match => {
        let date = n.find(s => s.id === match.contest_id);
        data.push({
            scheduledDate : date.date,
            stream: date.stream,
            homeCoach: match.opponents[0].coach.name,
            homeTeam: match.opponents[0].team.name,
            homeTeamLogo: match.opponents[0].team.logo,
            awayCoach: match.opponents[1].coach.name,
            awayTeam: match.opponents[1].team.name,
            awayTeamLogo: match.opponents[1].team.logo,
            match_uuid : match.match_uuid,
            contest_id: match.contest_id,
            league:match.league,
            competition:match.competition

        })

    })

    schedules = await schedules.sort((a,b) => a.scheduledDate > b.scheduledDate ? 1 : -1 )

    res.send(data);
});

router.post("/stream/:contest_id", util.ensureAuthenticatedApi, async function(req, res){
    try{
        let date = await datingService.getDate(Number(req.params.contest_id));
        let user = await accountService.getAccount(req.user.name);

        if(date && !date.stream){
            date.stream = {name: user.reddit, url:user.twitch};
            await datingService.update(date.id, date);
            res.status(200).send(date);
        } else {
            res.status(403).send();
        }
    } catch(ex){
        console.log(ex)
        res.status(500).send();
    }
});

router.post("/unstream/:contest_id", util.ensureAuthenticatedApi, async function(req, res){
    try{
        let date = await datingService.getDate(Number(req.params.contest_id));

        if(date && date.stream){
            delete date.stream;
            await datingService.update(date.id, date);
            res.status(200).send(date);
        } else {
            res.status(403).send();
        }
    } catch(ex){
        console.log(ex)
        res.status(500).send();
    }
});


module.exports = router;