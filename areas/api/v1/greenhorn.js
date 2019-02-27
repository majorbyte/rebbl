'use strict';
const db = require('../../../lib/signupService.js')
  , teamService = require('../../../lib/teamservice.js')
  , util = require('../../../lib/util.js')
  , express = require('express')
  , router = express.Router();

router.get('/', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res,next){

  const signups = await db.getSignUps({'greenHorn':true})
  
  let data = signups.all;

  data = await Promise.all(data.map(async s => {
      let team = await teamService.getTeamById(s.teamId);

      if (!team)
        team = await teamService.retrieveTeam(s.team);

      if (team){
        s.stadium = team.team.stadiumname;
        s.fresh = team.team.created == team.team.datelastmatch;
      }
      return s;
  }));

  const csv = data.map(function(row){
    return `${JSON.stringify(row.team)},${JSON.stringify(row.stadium)},${JSON.stringify(row.race)},${JSON.stringify(row.timezone)},${JSON.stringify(row.reddit)},${JSON.stringify(row.discord)},${JSON.stringify(row.coach)},${JSON.stringify(row.steam)},${JSON.stringify(row.league)},${JSON.stringify(row.teamExist ? true:false)},${JSON.stringify(row.fresh)}`;
  });

  csv.unshift('team name,stadium,race,timezone,reddit name,discord,blood bowl 2 name,steam name,region,teamExist,fresh');


  res.setHeader("content-type", "text/csv");
  res.set('Content-Type', 'application/octet-stream');
  res.attachment('greenhorn.csv');
  res.status(200).send(csv.join('\r\n'));

});


module.exports = router;