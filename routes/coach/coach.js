'use strict';
const db = require('../../lib/LeagueService.js')
  , express = require('express')
  , teamService = require('../../lib/teamservice.js')
  , accountService = require("../../lib/accountService.js")
  , util = require('../../lib/util.js');

class Coach{
	constructor(){
		this.router = express.Router({mergeParams:true});
	}


  routesConfig(){
    this.router.get('/bb3/:coach_id', util.cache(10*60), async function(req, res){
      const coach = await accountService.searchAccount({"bb3id": req.params.coach_id});

      if (coach && coach.coach) {
        res.redirect(`/coach/${coach.coach}/details`);
      } else {
        let data = {};
        data.coachDetails = coach;
    
        data.renderExtra = false;
      
        data.company = req.params.company;   
        res.render('coach/details', data);        
      }
    });

    this.router.get('/:coach_id', util.cache(10*60), async function(req, res){
      res.redirect(`/coach/${req.params.coach_id}/details`);
    });
    
    this.router.get('/:coach_id/teams', util.cache(10*60), async function(req, res){
      let data = await db.getCoach(req.params.coach_id);
      if (data)
        data.teams = await teamService.getTeams(data.id);
      data.company = req.params.company;   
      res.render('coach/teams', data);
    });
    
    this.router.get('/:coach_id/matches', util.cache(10*60), async function(req, res){
      let data = await db.getCoach(req.params.coach_id);
      if (data)
        data.matches = await db.getMatchesForCoach(data.id);
      data.company = req.params.company;   
      res.render('coach/matches', data);
    });
    
    this.router.get('/:coach_id/trophies', util.cache(10*60), async function(req, res){
      let data = await db.getCoach(req.params.coach_id);
      if (data){
        data.coachDetails = await accountService.searchAccount({"coach": {$regex: new RegExp(`^${data.name?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,"i")}});
        data.renderExtra = true;
      }
      data.company = req.params.company;   
      if (!data.coachDetails) data.coachDetails = {trophies : []};
      res.render('coach/trophies', data);
    });
    
    this.router.get('/:coach_id/details', util.cache(10*60), async function(req, res){
      let data = await db.getCoach(req.params.coach_id);

      if (data) {
        data.name +="";
        data.coachDetails = await accountService.searchAccount({"coach": {$regex: new RegExp(`^${data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,"i")}});
        if (!data.coachDetails)
          data.coachDetails = await accountService.searchAccount({"coach": {$regex: new RegExp(`^${data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,"i")}});
        data.renderExtra = true;
      } else {
        data = {};
        data.coachDetails = await accountService.searchAccount({"coach": {$regex: new RegExp(`^${req.params.coach_id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,"i")}});
        if (!data.coachDetails)
          data.coachDetails = await accountService.searchAccount({"coach": {$regex: new RegExp(`^${req.params.coach_id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,"i")}});
    
        data.renderExtra = false;
      }
    
      data.company = req.params.company;   
      res.render('coach/details', data);
    });
    

    return this.router;
  }

}


module.exports = Coach;
