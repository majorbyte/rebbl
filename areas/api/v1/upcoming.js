'use strict';
const LeagueService = require('../../../lib/LeagueService.js')
  , datingService = require("../../../lib/DatingService.js")
  , util = require('../../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});


router.get('/', util.checkCache, async function(req, res){
    let n = await datingService.all();    
    let dates = [...new Set(n.map(date=> date.id))];

    let schedules = await LeagueService.searchLeagues({"contest_id":{$in:dates}});

    let data = [];

    schedules.map(match => {
        data.push({
            scheduledDate : n.find(s => s.id === match.contest_id).date,
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

router.get('/:date', async function(req, res){


});


module.exports = router;