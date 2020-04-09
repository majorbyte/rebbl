'use strict';
const 
  cache = require("memory-cache")
  , campingService = require("../../lib/CampingService.js")
  , clanService = require("../../lib/ClanService.js")
  , configurationService = require("../../lib/ConfigurationService.js")
  , chaos = require('../../lib/ChaosService.js')
  , cripple = require('../../lib/crippleService.js')
  , express = require('express')
  , hjmc = require("../../lib/TourneyService")
  , loggingService = require("../../lib/loggingService.js")
  , maintenanceService = require('../../lib/MaintenanceService.js')
  , perpetualService = require('../../lib/PerpetualService.js')
  , team = require('../../lib/teamservice.js')
  , signUp = require('../../lib/signupService.js')
  , standingsService = require("../../lib/StandingsService.js")
  , util = require('../../lib/util.js')
  , reddit = require("../../lib/RedditService.js");


class Maintenance{
	constructor(){
		this.router = express.Router();
	}


  routesConfig(){
    this.router.get('/update/cripple', util.verifyMaintenanceToken, async function(req, res){
      //if (req.app.locals.cyanideEnabled) cripple.getMatches();
      try{
        chaos.getMatches();
      }
      catch(e){
        loggingService.error(e);
      }
      //cracker.checkAchievements();
      res.redirect('/');
    });

    this.router.get('/wintercamping', util.verifyMaintenanceToken, async function(req, res){
      if (req.app.locals.cyanideEnabled) campingService.updateBadges();
      res.redirect('/');
    });

    this.router.get('/test', util.verifyMaintenanceToken, async function(req, res){
      //cracker.registerTeam("majorbyte", "MajorTest2")
      //cracker.getCheaters();
      //cracker.fixRebuilders();
      try{
        perpetualService.getMatches();
      }
      catch(e){
        loggingService.error(e);
      }
      res.redirect('/');
    });

    this.router.get('/update/cripple/calculate', util.verifyMaintenanceToken, async function(req, res){
      if (req.app.locals.cyanideEnabled) cripple.calculateStandings("REBBL Cripple Ladder - Season 4");
      res.redirect('/');
    });


    this.router.get('/updateleague/init', util.verifyMaintenanceToken, async function(req, res){
      if (req.app.locals.cyanideEnabled) maintenanceService.initRebblData(req.query.league, req.query.comp);
      res.redirect('/');
    });

    this.router.get('/updateleague/admininit', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
      if (req.query.league && req.app.locals.cyanideEnabled) maintenanceService.getRebblData(req.query.league, req.query.comp);
      res.redirect('/');
    });


    this.router.get('/updateleague', util.verifyMaintenanceToken, async function(req, res){
      if (req.app.locals.cyanideEnabled){
        try{
          await maintenanceService.getRebblData(req.query.league);
        }
        catch(e){
          loggingService.error(e);
        }
        try{
          await maintenanceService.getNewRebblData(req.query.league);
          await maintenanceService.getContests(req.query.league);
        }
        catch(e){
          loggingService.error(e);
        }
        try{
          await maintenanceService.getImperiumMatches();
          await perpetualService.getMatches();
        }
        catch(e){
          loggingService.error(e);
        }
        try{
          await clanService.getContestData();
        }
        catch(e){
          loggingService.error(e);
        }
        try{
          await clanService.getMatchData();
        }
        catch(e){
          loggingService.error(e);
        }
        try{
          clanService.calculateStandings();
        }
        catch(e){
          loggingService.error(e);
        }
        try{
          reddit.check();
        }
        catch(e){
          loggingService.error(e);
        }
        try{
          reddit.getAnnouncements();
        }
        catch(e){
          loggingService.error(e);
        }
      }
      res.redirect('/');
    });

    this.router.get('/updateteams', util.verifyMaintenanceToken, async function(req, res){
      if (req.app.locals.cyanideEnabled){
        if (req.query.id) team.updateTeams(parseInt(req.query.id));
        else team.updateTeams(null,req.query.justteams);
      }
      res.redirect('/');
    });

    this.router.get('/checksignups',util.verifyMaintenanceToken, async function(req, res){
      if (req.app.locals.cyanideEnabled) signUp.checkTeams({'teamExist':false});
      if (req.app.locals.cyanideEnabled) signUp.checkTeams({'teamExist':{ $exists: false }});
      res.redirect('/');
    });

    
    this.router.get('/updateHJMC',util.verifyMaintenanceToken, async function(req, res){
      if (req.app.locals.cyanideEnabled) hjmc.getContests();
      res.redirect('/');
    });

    this.router.get('/calculate', util.verifyMaintenanceToken, async function(req,res){

      let seasons = [configurationService.getActiveSeason()];
      seasons = seasons.concat(configurationService.getActiveUpstartSeason());          
      seasons = seasons.concat(configurationService.getActiveMinorsSeason());          
      seasons = seasons.concat(configurationService.getActiveCollegeSeason());          

      seasons.map(season => {
        season.leagues.map(league =>{
          league.divisions.map(division => standingsService.updateStandings(league.name,division));

          cache.keys().map(key => {
            if (key.toLowerCase().indexOf(encodeURI(`${league.name}/${season}`))>-1){
              cache.del(key);
            }
          });
        });
      });

      seasons = [configurationService.getActiveOneMinuteSeason()];
      seasons.map(season => hjmc.calculateStandingsHJMC(season.leagues[0].name,season.name,season.leagues[0].name));
      res.redirect('/');
    });

    return this.router;
  }
}

module.exports = Maintenance;