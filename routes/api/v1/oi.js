'use strict';
const db = require('../../../lib/signupService.js')
  , util = require('../../../lib/util.js')
  , dataService = require("../../../lib/DataService.js").rebbl
  , express = require('express')
  , router = express.Router();

router.get('/', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){

  const signups = await db.getSignUps();

  let data = signups.all.filter(x => x.OI);

  

  let csv = 'team name,race,timezone,reddit name,discord,blood bowl 2 name,steam name,reqion,comp\r\n';
  
  for (var row of data){
    let regexp = new RegExp(row.team,"i");
    let schedules = await dataService.getSchedules({"opponents.team.name":regexp, season:"season 12", league:/^Rebbl - /i});
    if (schedules.length === 0){
      schedules = await dataService.getSchedules({"opponents.team.name":regexp, season:"season 11", league:/^Rebbl - /i});
    }
    if (schedules.length === 0){
      schedules = await dataService.getSchedules({"opponents.team.name":regexp, season:"season 10", league:/^Rebbl - /i});
    }
    let comp = "";
    if (schedules.length !== 0)
      comp = schedules[0].competition;

    if (schedules.length === 0){
      schedules = await dataService.getSchedules({"opponents.team.name":regexp, league:/^Rebbrl/i});
      if (schedules.length !== 0)
        comp = schedules[0].competition;
    }

    csv += `${JSON.stringify(row.team)},${JSON.stringify(row.race)},${JSON.stringify(row.timezone)},${JSON.stringify(row.reddit)},${JSON.stringify(row.discord)},${JSON.stringify(row.coach)},${JSON.stringify(row.steam)},${JSON.stringify(row.league)},${comp}\r\n`;
  }


  res.setHeader("content-type", "text/csv");
  res.set('Content-Type', 'application/octet-stream');
  res.attachment('oi.csv');
  res.status(200).send(csv);

});


module.exports = router;