'use strict';
const db = require('../../../lib/signupService.js')
  , util = require('../../../lib/util.js')
  , express = require('express')
  , router = express.Router();


router.get('/', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res, next){
    const data = await db.getSignUps({});

    const csv = data.all.map(function(row){
      return `${JSON.stringify(row.coach)},${JSON.stringify(row.team)},${JSON.stringify(row.race)},${JSON.stringify(row.league)},${JSON.stringify(row.competition || "")},${JSON.stringify(row.timezone)},${JSON.stringify(row.saveType)},${JSON.stringify(row.reddit)},${JSON.stringify(row.discord)},${JSON.stringify(row.steam)},${JSON.stringify(row.confirmed || false)},${JSON.stringify(row.currentTV)},${JSON.stringify(row.actualTV)},${JSON.stringify(row.players)},${JSON.stringify(row.ff)},${JSON.stringify(row.cheerleaders)},${JSON.stringify(row.coaches)},${JSON.stringify(row.apothecary)},${JSON.stringify(row.rerolls)},${JSON.stringify(row.cash)},${JSON.stringify(row.lonerCost)},${JSON.stringify(row.rerollCost)}`;
    });

    csv.unshift('blood bowl 2 name,team name,race,league,division,timezone,state,reddit name,discord,steam name, confirmed,currentTV,actualTV,players,ff,cheerleaders,coaches,apothecary,rerolls,cash,lonerCost,rerollCost');

    res.setHeader("content-type", "text/csv");
    res.set('Content-Type', 'application/octet-stream');
    res.attachment('signups.csv');
    res.status(200).send(csv.join('\r\n'));

});


router.get('/page', util.checkCache, async function(req, res, next){
  const data = await db.getSignUps({type:"rebbl"});

  const ret = data.all.map(function(row){

    return {
      team: row.team,
      teamId: row.teamId,
      coach: row.coach,
      race: row.race,
      timezone: row.timezone,
      saveType: row.saveType,
      TV: row.currentTV,
      league: row.league,
      OI: row.OI,
      greenHorn: row.greenHorn
    }

  });
  res.status(200).send(ret);
});

router.get('/count', util.checkCache, async function(req, res, next){
  const data = await db.getSignUps({});

  res.status(200).send({count:data.all.length});
});

router.get('/rookie/:coach', async function(req, res, next){
  const data = await db.getRookieTeam(req.params.coach);

  res.status(200).send(JSON.stringify({"team":data.team, race:data.race}));
});


module.exports = router;