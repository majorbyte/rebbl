
'use strict';
const dataService = require('../../../lib/DataService.js').rebbl
  , express = require('express')
  , util = require('../../../lib/util.js');

class TeamApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }

  routesConfig(){
    this.router.get('/:teamId', util.cache(600), async function(req, res){
      try {
        let team = await dataService.getTeam({"team.id":Number(req.params.teamId)});
        team.team.coachname = team.coach ? team.coach.name : 'AI';
        delete team.roster;
        delete team.coach;
        res.json(team);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    
    });
    
    this.router.get('/:teamId/players', util.cache(600), async function(req, res){
      try {
        let players = await dataService.getPlayers({"teamId":Number(req.params.teamId),"active":true});
        res.json(players);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });
    
    this.router.get('/:teamId/retiredplayers', util.cache(600), async function(req, res){
      try {
        let players = await dataService.getPlayers({"teamId":Number(req.params.teamId),"active":false, "id":{$ne:null}});
        res.json(players);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });
    
    this.router.get('/:teamId/hiredplayers', util.cache(600), async function(req, res){
      try {
        let players = await dataService.getPlayers({"teamId":Number(req.params.teamId),"active":false, "id":null});
        res.json(players);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });

    this.router.get('/:teamId/hiredplayers', util.cache(600), async function(req, res){
      try {
        let players = await dataService.getPlayers({"teamId":Number(req.params.teamId),"active":false, "id":null});
        res.json(players);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });

    this.router.get('/:teamId/matches', util.cache(600), async function(req, res){
      try {
        let players = await dataService.getMatches({"match.teams.idteamlisting":Number(req.params.teamId)});
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