
'use strict';
const dataService = require('../../../lib/DataService.js').rebbl
  , configurationService = require("../../../lib/ConfigurationService.js")
  , express = require('express')
  , leagueService = require('../../../lib/LeagueService.js') 
  , util = require('../../../lib/util.js');

class StandingsApi{
  constructor(){
    this.router = express.Router({mergeParams: true})
  }
  routesConfig(){
    this.router.get('/coach/:id', util.cache(600), async function(req, res){
      let standings = await dataService.getStandings({id:Number(req.params.id),$or:[{admin:{$exists:false}},{admin:false}]});
    
      res.json(standings);
    });

    
    this.router.get('/csv/:league/:filter', util.ensureAuthenticated, util.hasRole("admin"), async function(req,res){
      let league = req.params.league;
      let filter = req.params.filter.replace('*','');
    
      let standings = await dataService.getStandings({league:new RegExp(`${league}`,'i'), season:filter});
    
      const csv = standings.map(function(row){
        return `${JSON.stringify(row.competition || "")},${JSON.stringify(row.name)},${JSON.stringify(row.team)},${JSON.stringify(row.points)},${JSON.stringify(row.games)},${JSON.stringify(row.win)},${JSON.stringify(row.draw)},${JSON.stringify(row.loss)},${JSON.stringify(row.tddiff)}`;
      });
    
      csv.unshift('competition,coach,team,points,games,win,draw,loss,tddiff');
    
      res.setHeader("content-type", "text/csv");
      res.set('Content-Type', 'application/octet-stream');
      res.attachment(`${req.params.league}.csv`);
      res.send(csv.join('\r\n'));
    
    
    });

    this.router.get('/:league/:season/', util.cache(300), async function(req, res){
      let standings = await dataService.getStandings({
        "league":new RegExp(`^${req.params.league}$`,"i"), 
        "season":new RegExp(`^${req.params.season}$`,"i")
      });
    
      res.json(standings);
    });

    this.router.get('/:league/:season/tickets', util.cache(300), async function(req, res){
      let tickets = configurationService.getPlayoffTickets(req.params.league);

      
    
      res.json(tickets.find(t => t.name === req.params.season));
    });


    this.router.get('/:league/:season/:division', util.cache(300), async function(req, res){
      let standings = await dataService.getStandings({
        "league":new RegExp(`^${req.params.league}`,"i"), 
        "season":new RegExp(`^${req.params.season}`,"i"), 
        "competition":new RegExp(`^${req.params.division}`,"i")
      });
    
      res.json(standings);
    });

    this.router.get('/:team', util.cache(600), async function(req, res){
      let standings = await dataService.getStandings({teamId:Number(req.params.team)});
    
      res.json(standings);
    });

    
    return this.router;
  }
}



module.exports = StandingsApi;