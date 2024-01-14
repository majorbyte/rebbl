'use strict';
const express = require('express')
, dataService = require('../../lib/DataService.js').rebbl
, configurationService = require('../../lib/ConfigurationService.js')
, util = require('../../lib/util.js')
, colorHelper = require('../../lib/colorhelper.js');



class Standings{
	constructor(){
		this.router = express.Router({mergeParams:true});
	}

  

  routesConfig(){
    this.router.get('/:league', util.cache(300), async function(req, res){
      let data = {company:req.params.company};
      if(data.company ==='hjmc')
        res.render('rebbl/standings/hjmc', data);
      //if(req.params.league === 'Rebbl One Minute League')
      //  res.render('rebbl/standings/hjmc', data);
      else
        res.render('rebbl/standings/index', data);
    });

    this.router.get('/:league/:season/:competition',util.cache(300), async function(req, res){
      const teamName1 = function(name){
        if (/\[colour=/i.test(name)){
            name = name.replace(/\[colour=.*]/i,'');
        }
        name = name.trim().split(' ');
        name.splice(-1,1);
        if (name.length === 0) return '\xA0';
        return name.join(' ');
      };
      const teamName2= function(name){
        if (/\[colour=/i.test(name)){
            name = name.replace(/\[colour=.*]/i,'');
        }
        name = name.trim().split(' ');
        return name.splice(-1,1);
      };

      let competition = req.params.competition;
      if (!isNaN(competition)){
        const comp = await dataService.getSchedule({season:req.params.season, league:req.params.league, competition_id: Number(competition)});
        competition = comp.competition;
      }

      let data = {company:req.params.company, league:req.params.league, competition:competition, season:req.params.season};
      if(data.company ==='caster'){
        try{

          data.tickets = configurationService.getCompetitionTickets(data.season, data.league, data.competition);
          const standings = await dataService.getStandings({
            'league':new RegExp(`^${data.league}$`,'i'), 
            'season':new RegExp(`^${data.season}$`,'i'), 
            'competition':new RegExp(`^${data.competition}$`,'i')
          });
          data.standings = [];
          for(const standing of standings){
            standing.teamName1 = teamName1(standing.team);
            standing.teamName2 = teamName2(standing.team);
            
            if (standing.logo) continue;
    
            const team = await dataService.getTeam({'team.id': standing.teamId});
            if (team) standing.logo = team.team.logo;
          }

          for(let x in [0,1])
            data.standings[x] = standings.filter((n,i) => i >= x*Math.floor(standings.length/2) && i < Math.floor(standings.length/2) + x*Math.floor(standings.length/2));

          data.styles ={};
          standings.forEach(standing => data.styles[standing.logo.toLowerCase()] =  colorHelper.backgroudColor(standing.logo));
          res.render('rebbl/standings/caster', data);
        } catch(ex){
          console.dir(ex);
          res.status(500).render('5xx');
        }
      } else if (data.company === 'graph'){
        try{
          const standings = await dataService.getStandings({
            'league':new RegExp(`^${data.league}$`,'i'), 
            'season':new RegExp(`^${data.season}$`,'i'), 
            'competition':new RegExp(`^${data.competition}$`,'i')
          });

          data.standings = standings.map(x => ({
            logo: x.logo,
            name: x.name,
            team: x.team,
            progression: x.progression,
            logoColor: x.logoColor,

          }));

          data.title = `${req.params.league} ${req.params.competition}`;

          res.render('rebbl/standings/graph', data);
        } catch(ex){
          console.dir(ex);
          res.status(500).render('5xx');
        }
      }
      else
        res.render('rebbl/standings/index', data);
    });
    return this.router;
  }
}  

module.exports = Standings;