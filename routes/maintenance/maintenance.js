'use strict';

const bb3MatchReport = require("../../lib/bb3MatchReport.js");
const bb3Service = require("../../lib/bb3Service.js");

const 
  cache = require("memory-cache")
  , campingService = require("../../lib/CampingService.js")
  , clanService = require("../../lib/ClanService.js")
  , configurationService = require("../../lib/ConfigurationService.js")
  , offseasonService = require('../../lib/OffSeasonService.js')
  , ds = require("../../lib/DraftService.js")
  , dataService = require("../../lib/DataService.js").rebbl
  , bb3 = require("../../lib/bb3Service.js").rebbl3
  , bb3Report = require("../../lib/bb3MatchReport.js")
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
      try{
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

    this.router.get('/schedules' , util.verifyMaintenanceToken, async function(req,res){
    
      if (req.query.key){
        const template = await dataService.getScheduleTemplate({key:req.query.key});

        let r = await reddit.postData(template);
        await reddit.updateSidebar(template,r[0]);

        dataService.updateScheduleTemplate({key:template.key},{$set:{round:template.round+1}});
      }else{
        const templates = await dataService.getScheduleTemplates({key:{$ne:"CLAN"},active:true});
        for (const template of templates){
          let r = await reddit.postData(template);
          await reddit.updateSidebar(template,r[0]);
  
          dataService.updateScheduleTemplate({key:template.key},{$set:{round:template.round+1}});
        }
      }
      res.redirect('/');
    });


    this.router.get('/scheduleClan' , util.verifyMaintenanceToken, async function(req,res){
      const week = util.getISOWeek();

      if (week % 2 === 1) {
        const template = await dataService.getScheduleTemplate({key:"CLAN"});
        if (template && template.active){
          let date = new Date(Date.now());
          date.setDate(date.getDate() + 15);
      
          let r = await reddit.postData(template, date.toDateString());
          await reddit.updateSidebar(template,r[0]);
    
          dataService.updateScheduleTemplate({key:template.key},{$set:{round:template.round+1}});
        }
      }
  
      res.redirect('/');
    });

    this.router.get('/updatebb3', util.verifyMaintenanceToken, async function(req, res){
      updateBB3();
      res.redirect('/');
    });

    const updateBB3 = async function (){
      const compIds = ["5d031521-b151-11ed-80a8-020000a4d571","2b791aa6-b14d-11ed-80a8-020000a4d571"];

      for(const id of compIds){
        const ids = await bb3Service.getRanking(id);
        if (ids.length === 0) continue;
        
        await bb3Service.getTeams(ids);
        const matchIds = await bb3Service.updateMatches(ids,id);
        await bb3Service.calculateStandings(id);
    
        const hookUrl = id === "2b791aa6-b14d-11ed-80a8-020000a4d571" 
          ? process.env.BB3Hook
          : process.env.BB3RookiesHook;
        for(const matchId of matchIds){
          await bb3MatchReport.matchReport(matchId, hookUrl);
        }
      }      
    }

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
          console.dir(e);
          loggingService.error(e);
        }
        try{
          await maintenanceService.getNewRebblData(req.query.league);
          await maintenanceService.getContests(req.query.league);
        }
        catch(e){
          console.dir(e);
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
          console.dir(e);
          loggingService.error(e);
        }
        try{
          await clanService.getMatchData();
        }
        catch(e){
          console.dir(e);
          loggingService.error(e);
        }
        try{
          clanService.calculateStandings();
        }
        catch(e){
          console.dir(e);
          loggingService.error(e);
        }
        
        try{
          reddit.check();
        }
        catch(e){
          console.dir(e);
          loggingService.error(e);
        }
        try{
          reddit.getAnnouncements();
        }
        catch(e){
          console.dir(e);
          loggingService.error(e);
        }
        try{
          signupService.checkTeams();
        }
        catch(e){
          console.dir(e);
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