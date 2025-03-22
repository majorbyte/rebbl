'use strict';

const bb3MatchReport = require("../../lib/bb3MatchReport.js");
const bb3Service = require("../../lib/bb3Service.js");

const 
  cache = require("memory-cache")
  , clanService = require("../../lib/ClanService.js")
  , configurationService = require("../../lib/ConfigurationService.js")
  , dataService = require("../../lib/DataService.js").rebbl
  , bb3 = require("../../lib/DataServiceBB3.js").rebbl3
  , express = require('express')
  , loggingService = require("../../lib/loggingService.js")
  , maintenanceService = require('../../lib/MaintenanceService.js')
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
    this.router.get('/test', util.verifyMaintenanceToken, async function(req, res){
      try{


        //const competitions = await bb3.getCompetitions({leagueId:"94f0d3aa-e9ba-11ee-a745-02000090a64f"});
        //for (const competition of competitions) await bb3Service.calculateStandings(competition.id);
          
        //await bb3Service.updateTeam("45602e32-7817-11ef-be7b-bc24112ec32e",true);

        //await clanService.updateUnstarted("Division 1", 1, 6);
        //await clanService.updateUnstarted("Division 1");
        //await clanService.getMatchData();
        //await bb3Service.checkRetiredPlayers();

        //await clanService.getContestData();
        //await bb3Service.updateCompetitions("94f0d3aa-e9ba-11ee-a745-02000090a64f");
        //await bb3Service.handleRetiredPlayers("bb4a531b-e9d9-11ee-a745-02000090a64f","f41cfddc-d425-11ee-a745-02000090a64f");

        //const test = require ("../../lib/createScheduleService.js");

        //await test.deleteCompetition("dbf045a9-4cc7-11ef-be7b-bc24112ec32e");

        //update round

        //const id = await test.create("594eecd4-4cc8-11ef-be7b-bc24112ec32e");

        //await test.swap("594eecd4-4cc8-11ef-be7b-bc24112ec32e",id,0);


        const ids = ["5abb6c16-ede3-11ef-a124-bc2411305479"]
        for(const id of ids){
          const schedules = await bb3.getSchedules({competitionId:id,round:3});

          for(const match of schedules){
            const response = await fetch(`http://rebbl.net:47018/api/statistics/dice/${match.gameId}`); 
            if (!response.ok) continue;
  
            const data = await response.json();
  
            if (!data.responseGetMatchDiceRolls) continue;

            data.responseGetMatchDiceRolls.matchDiceRolls.matchId = match.matchId;
            data.responseGetMatchDiceRolls.matchDiceRolls.gameId = match.gameId;
            
            await bb3.updateDice({matchId:match.matchId,gameId:match.gameId},data.responseGetMatchDiceRolls.matchDiceRolls,{upsert:true});
          }
  
        }
           
       
           
          
      

        //await adminMatchService.mockConcedeMatch("fa01ab2f-9c61-41eb-a86d-d59572260347","30e3a678-e0b9-11ee-a745-02000090a64f");
      } catch(e) {
        console.log(e);
      }
      res.redirect('/');
    });

    this.router.get('/bb3', util.verifyMaintenanceToken, async function(req, res){
      if (!configurationService.updateAllowed()) return;
      try{
        
        await bb3Service.updateCompetitions("94f0d3aa-e9ba-11ee-a745-02000090a64f");

        await bb3Service.calculateLeagueStandings("94f0d3aa-e9ba-11ee-a745-02000090a64f");

        for(const leagueId of ["94f0d3aa-e9ba-11ee-a745-02000090a64f"]){
          const competitions = await bb3.getCompetitions({leagueId:leagueId});
          for (const competition of competitions){
            const matches = await bb3.getMatches({"competition.id": competition.id,$or:[{reported:false},{reported:{$exists:false}}]});
            for (const match of matches){
              try{
                await bb3MatchReport.matchReport(match.matchId);
              } catch(e){
                loggingService.error(e);
                loggingService.information(match.matchId);
              }
            }
          }
        }
        await bb3Service.checkUnvalidatedMatchState();
        await bb3Service.checkRetiredPlayers();

        res.redirect('/');
      }
      catch(e){
        loggingService.error(e);
      }
      
    });

    this.router.get('/bb3-teams', util.verifyMaintenanceToken, async function(req, res){
      try{
        await bb3Service.updateTeams("94f0d3aa-e9ba-11ee-a745-02000090a64f");
        res.redirect('/');
      }
      catch(e){
        loggingService.error(e);
      }
      
    });

    this.router.get('/bb3-coach', util.verifyMaintenanceToken, async function(req, res){
      try{
        await bb3Service.updateCoaches();
        res.redirect('/');
      }
      catch(e){
        loggingService.error(e);
      }
      
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

    this.router.get('/updateLegends', util.verifyMaintenanceToken, async function(req, res){
      await maintenanceService.updateLegendaryPlayers();
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
          //await maintenanceService.getRebblData(req.query.league);
          //await ts.checkTickets();
        }
        catch(e){
          console.dir(e);
          loggingService.error(e);
        }
        try{
          //await maintenanceService.getNewRebblData(req.query.league);
          //await maintenanceService.getContests(req.query.league);
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
          reddit.getAnnouncements();
        }
        catch(e){
          console.dir(e);
          loggingService.error(e);
        }
      }
    };

    this.router.get('/announcements', util.verifyMaintenanceHeader, async function(req,res){
      try{
        await reddit.getAnnouncements();
      }
      catch(e){
        console.dir(e);
        loggingService.error(e);
      }
      res.status(200).send();
    });

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
    
    this.router.get('/updateClanTeams', util.verifyMaintenanceToken, async function(req, res){
      if (req.app.locals.cyanideEnabled){
        await clanService.updateTeams();
      }
      res.redirect('/');
    });
    


    this.router.get('/updateteam', util.verifyMaintenanceToken, async function(req, res){
      bb3Service.updateTeam(req.query.id);
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
          league.divisions.map(division => standingsService.updateStandings(season.name, league.name,division));

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