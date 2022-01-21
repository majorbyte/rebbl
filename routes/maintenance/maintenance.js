'use strict';
const 
  cache = require("memory-cache")
  , campingService = require("../../lib/CampingService.js")
  , clanService = require("../../lib/ClanService.js")
  , configurationService = require("../../lib/ConfigurationService.js")
  , offseasonService = require('../../lib/OffseasonService.js')
  , ds = require("../../lib/DraftService.js")
  , dataService = require("../../lib/DataService.js").rebbl
  , express = require('express')
  , hjmc = require("../../lib/TourneyService")
  , loggingService = require("../../lib/loggingService.js")
  , maintenanceService = require('../../lib/MaintenanceService.js')
  , perpetualService = require('../../lib/PerpetualService.js')
  , rampupService = require("../../lib/Rampup.js")
  , team = require('../../lib/teamservice.js')
  , signUp = require('../../lib/signupService.js')
  , standingsService = require("../../lib/StandingsService.js")
  , signupService = require("../../lib/signupService.js")
  , ts = require("../../lib/TicketService.js")
  , util = require('../../lib/util.js')
  , reddit = require("../../lib/RedditService.js");



class Maintenance{
	constructor(){
		this.router = express.Router();
	}


  routesConfig(){
    this.router.get('/update/offseason', util.verifyMaintenanceToken, async function(req, res){
      if (req.app.locals.cyanideEnabled) {
        try{
          offseasonService.getMatches();
        }
        catch(e){
          loggingService.error(e);
        }
      }
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
        //await perpetualService.getMatches();
        //await maintenanceService.getRebblData(req.query.league);
        //clanService.calculateStandings();
        //await maintenanceService.getContests(req.query.league);
        //await maintenanceService.getRebblData(req.query.league);

        //await maintenanceService.getContests(req.query.league);
        /*
        const draft = await dataService.getDraft({
          house: 3,
          round: 9,
          competition: "Division 2a",
          season: "season 11"
        });
        ds.confirmDraft("minorbyte",draft);
      */
        /*let seasons = [configurationService.getActiveSeason()];
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
      */
        //await ts.checkTickets();

        reddit.check();


        res.redirect('/');
      }
      catch(e){
        loggingService.error(e);
      }
      
    });

    this.router.get('/updateleague/init', util.verifyMaintenanceToken, async function(req, res){
      if (req.app.locals.cyanideEnabled) maintenanceService.initRebblData(req.query.league, req.query.comp);
      res.redirect('/');
    });

    this.router.get('/updateleague/admininit', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
      if (req.query.league && req.app.locals.cyanideEnabled) maintenanceService.getRebblData(req.query.league, req.query.comp);
      res.redirect('/');
    });

    const updateClan = async function(req){
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
    };

    const doUpdates = async function(req){
      if (req.app.locals.cyanideEnabled){
        try{
          await maintenanceService.getRebblData(req.query.league);
          //await ts.checkTickets();
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
        /*try{
          await perpetualService.getMatches();
        }
        catch(e){
          loggingService.error(e);
        }*/
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
        try{
          signupService.checkTeams();
        }
        catch(e){
          loggingService.error(e);
        }  
        
      }
    };

    this.router.get('/updateleague', util.verifyMaintenanceToken, async function(req,res){
      doUpdates(req);
      res.redirect('/');
    });

    this.router.get('/updateclan', util.verifyMaintenanceToken, async function(req,res){
      updateClan(req);
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
      seasons = seasons.concat(configurationService.getActiveBeerSeason());          
      //let seasons = [configurationService.getActiveOneMinuteSeason()];          

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

      res.redirect('/');
    });

    return this.router;
  }
}

module.exports = Maintenance;