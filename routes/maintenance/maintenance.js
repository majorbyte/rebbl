'use strict';
const league = require('../../lib/LeagueService.js')
  , cripple = require('../../lib/crippleService.js')
  , express = require('express')
  , maintenanceService = require('../../lib/MaintenanceService.js')
  , team = require('../../lib/teamservice.js')
  , signUp = require('../../lib/signupService.js')
  , util = require('../../lib/util.js')
  , reddit = require("../../lib/RedditService.js");


class Maintenance{
	constructor(){
		this.router = express.Router();
	}


  routesConfig(){
    this.router.get('/update/cripple', util.verifyMaintenanceToken, async function(req, res){
      cripple.getMatches();
      res.redirect('/');
    });

    this.router.get('/update/cripple/calculate', util.verifyMaintenanceToken, async function(req, res){
      cripple.calculateStandings("REBBL Cripple Ladder");
      res.redirect('/');
    });


    this.router.get('/updateleague/init', util.verifyMaintenanceToken, async function(req, res){
      maintenanceService.initRebblData(req.query.league, req.query.comp);
      res.redirect('/');
    });

    this.router.get('/updateleague/admininit', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
      if (req.query.league) maintenanceService.getRebblData(req.query.league, req.query.comp);
      res.redirect('/');
    });


    this.router.get('/updateleague', util.verifyMaintenanceToken, async function(req, res){
      maintenanceService.getRebblData(req.query.league);
      reddit.check();
      res.redirect('/');
    });

    this.router.get('/updateteams', util.verifyMaintenanceToken, async function(req, res){
      if (req.query.id) team.updateTeams(parseInt(req.query.id));
      else team.updateTeams(null,req.query.justteams);
      res.redirect('/');
    });

    this.router.get('/checksignups',util.verifyMaintenanceToken, async function(req, res){
      signUp.checkTeams({'teamExist':false});
      signUp.checkTeams({'teamExist':{ $exists: false }});
      res.redirect('/');
    });

    return this.router;
  }
}

module.exports = Maintenance;