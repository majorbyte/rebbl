'use strict';
const express = require('express')
  , accountService = require("../../../lib/accountService.js")
  , cyanideService = require("../../../lib/CyanideService.js")
  , clanService = require("../../../lib/ClanService.js")
  , dataService = require("../../../lib/DataService.js").rebbl
  , util = require('../../../lib/util.js')

class DraftApi{
  constructor(){
    this.router = express.Router({mergeParams: true})
  }

  routesConfig(){
    this.router.get("/", util.ensureAuthenticated, async function(req, res){
      const account = await accountService.getAccount(req.user.name);
      const clan = await clanService.getClanByUser(account.coach); 
      const leader = await accountService.hasRole(req.user.name, "clanleader");

      const schedule = await dataService.getSchedule({league:"clan",status:"open",$or:[{"home.clan":clan.name},{"away.clan":clan.name}]},{sort:{round:1},limit:1});

      let clans = await dataService.getClans({name:{$in:[schedule.home.clan,schedule.away.clan]}});

      schedule.home.clan = clans.find(c => c.name === schedule.home.clan);
      schedule.away.clan = clans.find(c => c.name === schedule.away.clan);

      let teams = await dataService.getTeams({"team.id":{$in:schedule.home.clan.ledger.teams.map(team=> team.team.id).concat(schedule.away.clan.ledger.teams.map(team=> team.team.id))}});

      const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: "base"})
      for(var x = 0; x <5;x++){
        schedule.home.clan.teams[x] = teams.find(t => collator.compare(t.team.name,schedule.home.clan.teams[x]) === 0 );
        schedule.away.clan.teams[x] = teams.find(t => collator.compare(t.team.name,schedule.away.clan.teams[x]) === 0);
      }

      delete schedule.home.clan.ledger;
      delete schedule.away.clan.ledger;
      delete schedule._id;
      res.header("Access-Control-Allow-Origin", "http://localhost:8080").json({schedule, leader});
    });

 
    return this.router;
  }


}

module.exports = DraftApi;