'use strict';
const express = require('express')
, dataService = require('../../lib/DataService.js').rebbl
, configurationService = require("../../lib/ConfigurationService.js")
, util = require('../../lib/util.js');


class Standings{
	constructor(){
		this.router = express.Router({mergeParams:true});
	}


  routesConfig(){
    this.router.get('/:league', util.cache(300), async function(req, res){
      let data = {company:req.params.company};
      if(data.company ==="hjmc")
        res.render('rebbl/standings/hjmc', data);
      //if(req.params.league === "Rebbl One Minute League")
      //  res.render('rebbl/standings/hjmc', data);
      else
        res.render('rebbl/standings/index', data);
    });

    this.router.get('/:league/:season/:competition', async function(req, res){
      const teamName1 = function(name){
        if (/\[colour=/i.test(name)){
            name = name.replace(/\[colour=.*]/i,'');
        }
        name = name.trim().split(' ');
        name.splice(-1,1);
        if (name.length === 0) return "\xA0";
        return name.join(' ');
      };
      const teamName2= function(name){
        if (/\[colour=/i.test(name)){
            name = name.replace(/\[colour=.*]/i,'');
        }
        name = name.trim().split(' ');
        return name.splice(-1,1);
      };

      let data = {company:req.params.company, league:req.params.league, competition:req.params.competition, season:req.params.season};
      if(data.company ==="caster"){
        data.tickets = configurationService.getCompetitionTickets(req.params.league, req.params.competition);
        const standings = await dataService.getStandings({
          "league":new RegExp(`^${req.params.league}`,"i"), 
          "season":new RegExp(`^${req.params.season}`,"i"), 
          "competition":new RegExp(`^${req.params.competition}`,"i")
        });
        data.standings = [];
        for(const standing of standings){
          standing.teamName1 = teamName1(standing.team);
          standing.teamName2 = teamName2(standing.team);
          
          if (standing.logo) continue;
  
          const team = await dataService.getTeam({'team.id': standing.teamId});
          standing.logo = team.team.logo;
        }

        for(let x in [0,1])
          data.standings[x] = standings.filter((n,i) => i >= x*Math.floor(standings.length/2) && i < Math.floor(standings.length/2) + x*Math.floor(standings.length/2));

        res.render('rebbl/standings/caster', data);
      }
      else
        res.render('rebbl/standings/index', data);
    });
    return this.router;
  }
}  

module.exports = Standings;