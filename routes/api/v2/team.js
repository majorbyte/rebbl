
'use strict';

const 
  cyanideService = require("../../../lib/CyanideService.js")
  , dataService = require('../../../lib/DataService.js').rebbl
  , teamService = require('../../../lib/teamservice.js')
  , express = require('express')
  , rateLimit = require("express-rate-limit")
  , util = require('../../../lib/util.js');

class TeamApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }



  routesConfig(){
    this.router.get('/:teamId', /*util.cache(600),*/ async function(req, res){
      try {
        let team;
        if (isNaN(req.params.teamId)){
          team = await dataService.getTeam({"team.id":req.params.teamId});
          if (!team){
            const r = new RegExp(`^${req.params.teamId}$`,"i");
            team = await dataService.getTeam({"team.name":{$regex: r}});
          }
        } else {
          team = await dataService.getTeam({"team.id":Number(req.params.teamId)});
        }
        team.team.coachname = team.coach ? team.coach.name : 'AI';
        delete team.roster;
        delete team.coach;
        res.json(team);
      }
      catch (ex){
        res.status(500).json({error:ex.message});
      }
    
    });

    const apiRateLimiter = rateLimit({
      windowMs: 30 * 1000, // 1 hour window
      max: 2, // start blocking after 5 requests
      message:
        "Too many requests, please wait 30 seconds",
      keyGenerator: function(req){
        return req.user.name;
      }

    });

    this.router.get('/:teamId/cyanide', util.ensureAuthenticated, util.hasRole("admin"),apiRateLimiter, async function(req, res){
      const id = isNaN(req.params.teamId) ? req.params.teamId : Number(req.params.teamId);
      try {
        let team = await cyanideService.team({team:id});
        res.json(team);
      }
      catch (ex){
        console.error(ex);
        res.status(500).json({error:'Something something error'});
      }
    
    });
    
    this.router.get('/:teamId/players', util.cache(600), async function(req, res){
      const id = isNaN(req.params.teamId) ? req.params.teamId : Number(req.params.teamId);
      try {
        let players = await dataService.getPlayers({"teamId":id,"active":true});
        if (players.length === 0){
          let team = await dataService.getTeam({"team.id":id});
          if (team){
            players = team.roster;
          }
        }
        res.json(players);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });
    
    this.router.get('/:teamId/retiredplayers', util.cache(600), async function(req, res){
      const id = isNaN(req.params.teamId) ? req.params.teamId : Number(req.params.teamId);
      try {
        let players = await dataService.getPlayers({"teamId":id,"active":false, "id":{$ne:null}});
        res.json(players);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });
    
    this.router.get('/:teamId/hiredplayers', util.cache(600), async function(req, res){
      const id = isNaN(req.params.teamId) ? req.params.teamId : Number(req.params.teamId);
      try {
        let players = await dataService.getPlayers({"teamId":id,"active":false, "id":null});
        res.json(players);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });

    this.router.get('/:teamId/matches', util.cache(600), async function(req, res){
      const id = isNaN(req.params.teamId) ? req.params.teamId : Number(req.params.teamId);
      try {
        let players = await dataService.getMatches({"match.teams.idteamlisting":id});
        res.json(players);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });

    return this.router;
  }
}


module.exports = TeamApi;