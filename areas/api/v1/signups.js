'use strict';
const db = require('../../../lib/signupService.js')
  , util = require('../../../lib/util.js')
  , express = require('express')
  , router = express.Router();


router.get('/', util.ensureAuthenticated, async function(req, res, next){
  if (['FullMetalCOS', 'minorbyte', 'Harringzord', 'Miraskadu'].indexOf(req.user.name) === -1 ){
    next( new Error(403) );
  } else {
    const data = await db.getSignUps({});

    const csv = data.all.map(function(row){
      return `${JSON.stringify(row.team)},${JSON.stringify(row.race)},${JSON.stringify(row.coach)},${JSON.stringify(row.league)},${JSON.stringify(row.competition || "")},${JSON.stringify(row.timezone)},${JSON.stringify(row.saveType)},${JSON.stringify(row.reddit)},${JSON.stringify(row.discord)},${JSON.stringify(row.steam)},${JSON.stringify(row.confirmed || false)},${JSON.stringify(row.currentTV)},${JSON.stringify(row.actualTV)},${JSON.stringify(row.players)},${JSON.stringify(row.ff)},${JSON.stringify(row.cheerleaders)},${JSON.stringify(row.coaches)},${JSON.stringify(row.apothecary)},${JSON.stringify(row.rerolls)},${JSON.stringify(row.cash)},${JSON.stringify(row.lonerCost)},${JSON.stringify(row.rerollCost)}`;
    });

    csv.unshift('team name,race,blood bowl 2 name,league,division,timezone,state,reddit name,discord,steam name, confirmed,currentTV,actualTV,players,ff,cheerleaders,coaches,apothecary,rerolls,cash,lonerCost,rerollCost');

    res.setHeader("content-type", "text/csv");
    res.set('Content-Type', 'application/octet-stream');
    res.attachment('signups.csv');
    res.status(200).send(csv.join('\r\n'));
  }
});


module.exports = router;