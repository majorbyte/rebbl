"use strict";

const
  cache = require("memory-cache")
  , configurationService = require("./ConfigurationService.js")
  , cyanideService = require("./CyanideService.js")
  , dataService = require("./DataService.js").rebbl
  , datingService = require("./DatingService")
  , loggingService = require("./loggingService.js")
  , standingsService = require("./StandingsService.js")
  , teamService = require("./teamservice.js")
  , tourneyService = require("./TourneyService.js");

class MaintenanceService{
  async init(socket){

    this.socket = socket;
  }
  
    async getMatch(id){
      try {
        let stunties = [6,11,19];
        let exist = await dataService.getMatch({uuid: id});
  
        if (exist) return; //already exists
  
        let match = await cyanideService.match({match_id: id});
  
        // we need to manually correct surfs
        if (match.match.teams[0].roster)
          match.match.teams[0].inflictedpushouts = match.match.teams[0].roster.reduce(function(p,c){ return p + c.stats.inflictedpushouts; },0);
        if (match.match.teams[1].roster)
          match.match.teams[1].inflictedpushouts = match.match.teams[1].roster.reduce(function(p,c){ return p + c.stats.inflictedpushouts; },0);
  
        if (match){
          dataService.insertMatch(match);
          if(stunties.indexOf(match.match.teams[0].idraces) > -1 && stunties.indexOf(match.match.teams[1].idraces) > -1 ){
            cache.del("/rebbl/stunty");
            cache.del("/api/v1/standings/stunty");
          }
          await teamService.updateTeamsAfterMatch(match);
          
          await this.updateCAS(match.match.teams[0], match.match.teams[1]);

          cache.del(encodeURI("/api/v1/standings/Big O"));
          cache.del(encodeURI("/api/v1/standings/REL"));
          cache.del(encodeURI("/api/v1/standings/GMan"));
          cache.del(encodeURI("/api/v1/standings/rampup"));
          cache.del(encodeURI(`/`));
        }
      } catch(e) {
        console.log(id);
        console.log(e);
      }
    }
  
    async _parseContest(match, swiss, additional, skipMatch){
      
      if(swiss) {
        if(!match.opponents) return;
  
        match.old_comp = match.competition;
        match.competition = swiss.comp;
        match.round = swiss.round ? swiss.round : match.round+9;
        if(swiss.league){
          match.league = swiss.league;
        }
      }
  
      if (additional){
        match.old_comp = match.competition;
        match.competition = additional.comp;
        match.round = match.round + additional.offset;
      }
  
      let contest = await dataService.getSchedule({contest_id: match.contest_id});
  
      let contestHasWinner = contest && contest.winner !== null;
      let matchHasWinner = match && match.winner !== null;
  
      let mismatch = !contestHasWinner && matchHasWinner || contestHasWinner && matchHasWinner && contest.winner.coach.id !== match.winner.coach.id;
  
      if ( match.contest_id <= 187525 ){
        return;  
      } else if (!contest) {
        if (/rampup/i.test(match.competition)){
          dataService.updateSchedule({old_comp:match.old_comp},match, {upsert:true}); 
        } else{
          dataService.insertSchedule(match); 
        }
      } else if(contest.manual) {
        return;
      } else if (match.status === "played" && contest.match_uuid === null) {
        dataService.updateSchedule({contest_id: match.contest_id}, match);
      } else if (match.status === "played" && mismatch) {
        dataService.updateSchedule({contest_id: match.contest_id}, match);
      } else if (match.status === "scheduled" && match.opponents && (contest.opponents && (
          match.opponents[0].coach.id !== contest.opponents[0].coach.id
          || match.opponents[1].coach.id !== contest.opponents[1].coach.id 
          || match.opponents[0].team.id !== contest.opponents[0].team.id 
          || match.opponents[1].team.id !== contest.opponents[1].team.id ) || !contest.opponents) ){
        dataService.updateSchedule({contest_id: match.contest_id}, match);
        cache.del(encodeURI(`/rebbl/match/unplayed/${match.contest_id}`));
        cache.del(encodeURI(`/rebbrl/match/unplayed/${match.contest_id}`));
      }
  
      if (skipMatch) return;

      if (match.status === "played"){
        datingService.removeDate(match.contest_id);
        await this.getMatch(match.match_uuid);
      } 
    }
  
    async getRebblData(leagueName){
  
      let seasons;
      switch(leagueName){
        case "lineman":
          seasons = [configurationService.getActiveLinemanSeason()]; 
          break;
        case "elf":
          seasons = [configurationService.getActiveElflySeason()]; 
          break;
        case "rabble":
          seasons = [configurationService.getActiveRabblSeason()];
          break;
        case "rampup":
          seasons = [configurationService.getActiveRampupSeason()];
          break;
        case "eurogamer":
          seasons = [configurationService.getActiveEurogameSeason()];
          break;
        case "oi":
          seasons = [configurationService.getActiveOISeason()];
          break;
        case "greenhorn":
          seasons = [configurationService.getActiveGreenhornSeason()];
          break;
        default:
          //seasons = [configurationService.getActiveLinemanSeason()];
          //seasons = [configurationService.getActiveElflySeason()];
          //seasons = seasons.concat(configurationService.getActiveOISeason());
          seasons = [configurationService.getActiveGreenhornSeason()];
          //seasons = seasons.concat(configurationService.getActiveRabblSeason());
          //seasons = [configurationService.getActiveRampupSeason()];
          
          break;
      }
  
      try {
        await Promise.each(seasons, async season => {
          await Promise.each(season.leagues, async league=> {
            const data = await cyanideService.competitions({platform:"pc", league : league.name,limit:250});
            
            if (!data) return;
    
            for(let competition of data.competitions) {
              if(competition.status !== 1) continue;
              
              let division = competition.name;
              let swiss = null;
    
              if (!competition.name) return;
    
              if (league.multi && (competition.name.toLowerCase().indexOf("e-apo") > -1 || competition.name.toLowerCase().indexOf("template") > -1 )) {
                return;
              }
              if (league.multi && /ReBBL Open Invitational/i.test(competition.league.name) && competition.id < 127000 ){
                return;
              }
    
              
    
              if(league.swiss)
                swiss = league.swiss.find(function(a){return a.name === division;});
              if(league.multi ){
                let index = division.toLowerCase().indexOf("rd");
                let round =1;
                if (index > 0){
                  round = parseInt(division.substr(division.toLowerCase().indexOf("rd")+3,2));
                } else if (division.toLowerCase().indexOf("w") > -1){
                  index = division.toLowerCase().indexOf("w");
                  round = parseInt(division.substr(division.toLowerCase().indexOf("w")+1,1));
                }
                swiss = {comp: league.name, round:round, league: league.name};
              }
    
    
    
    
              let options = {platform:"pc", league : league.name, competition: competition.name, round: competition.round-1, status:"played", exact: 1, limit:150};
              if(league.multi ){
                let number = 1;
                if (competition.name.toLowerCase().indexOf("game") > -1 ){
                  number = parseInt(competition.name.substr(competition.name.toLowerCase().indexOf("game")+5,2));
                }
                else if (competition.name.lastIndexOf("G") > 0 ){
                  number = parseInt(competition.name.substr(competition.name.lastIndexOf("G")+1,2));
                }
                else if (competition.name.toLowerCase().indexOf("oi") > -1 ){
                  let n = competition.name.split(' ');
                  number = parseInt(n[1]);
                }
                  
                
                if (number > 20){
                  options.league = league.name + " 2";
                }
                if (number > 40){
                  options.league = league.name + " 3";
                }
                if (number > 60){
                  options.league = league.name + " 4";
                }
                if (number > 80){
                  options.league = league.name + " 5";
                }
                if (number > 100){
                  options.league = league.name + " 6";
                }
                if (number > 120){
                  options.league = league.name + " 7";
                }
    
              }
    
              /* we could have rolled over directly after a match, so double check last weeks matches */
              if (competition.round > 1 || league.name === "RAMPUP"){
                let contests = await cyanideService.contests(options);
                if (contests && contests.upcoming_matches){ 
                  await Promise.all(contests.upcoming_matches.map(async function(contest){
    
                    if (league.combine){
                      const div = league.combine.find(a => a.additional.find(b => b.name === contest.competition));
                      if (div){
                        const offset = div.additional.find(b => b.name === contest.competition).offset;
    
                        //fix competition name
                        contest.competition = div.comp;
                        //fix round
                        contest.round = contest.round + offset;
                      }
                    }
                    contest.season = season.name;
                    await this._parseContest(contest, swiss);
                  }, this));
                }
              }
    
              options = {platform:"pc", league : league.name, competition: division, round: competition.round, status:"*", exact: 1};
              if(league.multi ){
                let number = 1;
                if (competition.name.toLowerCase().indexOf("game") > -1 ){
                  number = parseInt(competition.name.substr(competition.name.toLowerCase().indexOf("game")+5,2));
                }
                else if (competition.name.lastIndexOf("G") > 0 ){
                  number = parseInt(competition.name.substr(competition.name.lastIndexOf("G")+1,2));
                }                
                else if (competition.name.toLowerCase().indexOf("oi") > -1 ){
                  let n = competition.name.split(' ');
                  number = parseInt(n[1]);
                }
                
                if (number > 20){
                  options.league = league.name + " 2";
                }
                if (number > 40){
                  options.league = league.name + " 3";
                }
                if (number > 60){
                  options.league = league.name + " 4";
                }
                if (number > 80){
                  options.league = league.name + " 5";
                }
                if (number > 100){
                  options.league = league.name + " 6";
                }
                if (number > 120){
                  options.league = league.name + " 7";
                }
    
              }
    
    
              /* get the current round matches, we ask for status = "*" because swiss matchups only are created until after rollover*/
              let contests = await cyanideService.contests(options);
    
              if (contests && contests.upcoming_matches){
                await Promise.all(contests.upcoming_matches.map(async function(contest){
                  if (league.combine){
                    const div = league.combine.find(a => a.additional.find(b => b.name === contest.competition));
                    if (div){
                      const offset = div.additional.find(b => b.name === contest.competition).offset;
    
                      //fix competition name
                      contest.competition = div.comp;
                      //fix round
                      contest.round = contest.round + offset;
                    }
                  }
                  contest.season = season.name;
                  await this._parseContest(contest, swiss);
                }, this));
    
                if (contests && contests.upcoming_matches && contests.upcoming_matches.length > 0){
                  if( swiss) {
                    division = swiss.comp;
                  }
    
                  await Promise.all(cache.keys().map(function(key){
                    if (key.toLowerCase().indexOf(encodeURI(`${division.toLowerCase()}`))>-1){
                      cache.del(key);
                    }
                    if (key.toLowerCase().indexOf(encodeURI(`${league.link.toLowerCase()}`)) >-1) {
                      cache.del(key);
                    }
                  },this));
                }
              }
            }
          });
        });
      }
      catch (e){
        //todo proper logging
        console.log(e);
      }
      cache.del("/");
      cache.del("/rebbl");
      cache.del("/rebbrl");
      return false;
    }
  


    async _parseNewContest(match, swiss, additional){
      let shouldRecalculate = false;

      try {
        if(swiss) {
          if(!match.opponents) return;
    
          match.old_comp = match.competition;
          match.competition = swiss.comp;
          match.round = swiss.round ? swiss.round : match.round+9;
          if(swiss.league){
            match.league = swiss.league;
          }
        }
    
        if (additional){
          match.old_comp = match.competition;
          match.competition = additional.comp;
          match.round = match.round + additional.offset;
        }
    
        let contest = await dataService.getSchedule({contest_id: match.contest_id});
    
        const contestHasWinner = contest && contest.winner !== null;
        const matchHasWinner = match && match.winner !== null;

        let mismatch = !contestHasWinner && matchHasWinner || contestHasWinner && matchHasWinner && contest.winner.coach.id !== match.winner.coach.id;
    
        match.competition = match.competition.replace("(17)","17");

        if (!contest) {
          dataService.insertSchedule(match); 
          shouldRecalculate = match.status === "played";
        } else if(contest.manual) {
          return false;
        } else if (match.status === "played" && (contest.match_uuid === null || mismatch)) {
          dataService.updateSchedule({contest_id: match.contest_id}, match);
          shouldRecalculate = true;
        } else if (match.status === "played" && contest.match_uuid && contest.match_uuid !== match.match_uuid ) {
          await teamService.substractMatch(contest.match_uuid);
          dataService.deleteMatch({uuid:contest.match_uuid});
          dataService.updateSchedule({contest_id: match.contest_id}, match);
          shouldRecalculate = true;
        } else if (match.status === "scheduled" && match.opponents && (contest.opponents && (match.opponents[0].coach.id !== contest.opponents[0].coach.id
                  || match.opponents[1].coach.id !== contest.opponents[1].coach.id ) || !contest.opponents) ){
          dataService.updateSchedule({contest_id: match.contest_id}, match);
          cache.del(encodeURI(`/rebbl/match/unplayed/${match.contest_id}`));
          cache.del(encodeURI(`/rebbrl/match/unplayed/${match.contest_id}`));
        }
    
        

        if (match.status === "played"){
          datingService.removeDate(match.contest_id);
        } 
      }
      catch(ex){
        loggingService.error(ex);
      }
      return shouldRecalculate;
    }


    async getImperiumMatches(){
      const leagues = ["REBBL Imperium","REBBL Imperium Extra","REBBL Imperium Extra 2"];

      let date = new Date(Date.now());
      date.setHours(date.getHours() -48);
      date = `${date.getFullYear()}-${date.getMonth() +1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:00`;
      

      let matches = await cyanideService.matches({platform:"pc","id_only":1, start:date, league:leagues.join(",")});

      if (!matches) return;

      matches = matches.matches.map(x => x.uuid);
      let found = await dataService.getMatches({"uuid":{$in:matches}},{"uuid":1});
      found = found.map(f => f.uuid);

      let newMatches = matches.filter(x => !found.includes(x));

      let data = [];
      await Promise.each(newMatches, async id =>{
        let match = await cyanideService.match({match_id: id});
        if(match) data.push(match);
      });


      await Promise.each(data, m => dataService.insertMatch(m));

    }


    async getNewRebblData(leagueName){
      let seasons;
      //keeping this for when league get moved
      switch(leagueName){
        case "oneminute":
          seasons = [configurationService.getActiveOneMinuteSeason()]; 
          break;
        case "beer":
          seasons = [configurationService.getActiveBeerSeason()]; 
          break;
        case "rebbl":
          seasons = [configurationService.getActiveSeason()];
          break;
        case "rookies":
          seasons = [configurationService.getActiveMinorsSeason()];
          seasons = seasons.concat(configurationService.getActiveUpstartSeason());          
          seasons = seasons.concat(configurationService.getActiveCollegeSeason());          
          break;
        default:
          seasons = [configurationService.getActiveSeason()];
          seasons = seasons.concat(configurationService.getActiveUpstartSeason());          
          seasons = seasons.concat(configurationService.getActiveMinorsSeason());
          seasons = seasons.concat(configurationService.getActiveCollegeSeason());          
          seasons = seasons.concat(configurationService.getActiveBeerSeason()); 
          seasons = seasons.concat(configurationService.getActiveOneMinuteSeason()); 
          break;
      }
  
      try {
        let date = new Date(Date.now());
        date.setHours(date.getHours() - 48);
        date = `${date.getFullYear()}-${date.getMonth() +1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:00`;

        for(let season of seasons){
          for(let league of season.leagues){

            let matches = await cyanideService.matches({platform:"pc","id_only":1, start:date, league:league.name});
            if (!matches) return;

            matches = matches.matches.map(x => x.uuid);
            let found = await dataService.getMatches({"uuid":{$in:matches}},{"uuid":1});
            found = found.map(f => f.uuid);

            let newMatches = matches.filter(x => !found.includes(x));

            let data = [];
            for(const id of newMatches){
              let match = await cyanideService.match({match_id: id});
              if(match) data.push(match);
            }

            for(const m of data){
              if (m.match.competitionname){
                m.match.competitionname = m.match.competitionname.replace("(17)","17");
              }  
              dataService.insertMatch(m);
            }
            await Promise.each(data, async m => await teamService.updateTeamsAfterMatch(m));
          }
        }
      }
      catch (e){
        loggingService.error(e);
      }
      cache.del("/");
      cache.del("/rebbl");
      cache.del("/rebbrl");
      return false;
    }

    async getContests(leagueName){
      let seasons;
      //keeping this for when league get moved
      switch(leagueName){
        case "oneminute":
          seasons = [configurationService.getActiveOneMinuteSeason()]; 
          break;        
        case "beer":
          seasons = [configurationService.getActiveBeerSeason()]; 
          break;
        case "rebbl":
          seasons = [configurationService.getActiveSeason()];
          break;
        case "rookies":
          seasons = [configurationService.getActiveMinorsSeason()];
          seasons = seasons.concat(configurationService.getActiveUpstartSeason());          
          seasons = seasons.concat(configurationService.getActiveCollegeSeason());          
          break;
        default:
          seasons = [configurationService.getActiveSeason()];
          seasons = seasons.concat(configurationService.getActiveUpstartSeason());          
          seasons = seasons.concat(configurationService.getActiveMinorsSeason());
          seasons = seasons.concat(configurationService.getActiveCollegeSeason());    
          seasons = seasons.concat(configurationService.getActiveBeerSeason()); 
          seasons = seasons.concat(configurationService.getActiveOneMinuteSeason()); 
          break;
      }


      for(let season of seasons){
        for(let league of season.leagues){
          let options = {platform:"pc", league : league.name, status:"*", exact: 1, limit:150};

          let contests = await cyanideService.contests(options);

          if(!contests || !contests.upcoming_matches) continue;

          let upcoming_matches = contests.upcoming_matches;

          //this (status:"*") works for round robin, because the API returns the latest played matched first
          //for swiss, this is hopeless, because we want to know the new schedules as well.

          if(league.format && league.format === "swiss"){
            options.status = "scheduled";
            let scheduled = await cyanideService.contests(options);

            for(let c of scheduled.upcoming_matches){
              if (!upcoming_matches.some(n => n.contest_id === c.contest_id) && c.opponents ){
                upcoming_matches.push(c);
              }
            }
          }


          if (league.combine){
            
            let c = await cyanideService.competitions({platform:"pc",league:league.name});
            
            let competition = c.competitions.find(x => x.format="swiss");

            options.competition = "swiss";
            delete options.exact;
            options.limit = 40;
            options.round=competition.round;
            let swiss = await cyanideService.contests(options);

            if(swiss && swiss.upcoming_matches) upcoming_matches = upcoming_matches.concat(swiss.upcoming_matches);
          }

          let toUpdate = [];          

          for(let contest of upcoming_matches){
            let swiss = null;

            if(league.swiss)
              swiss = league.swiss.find(function(a){return a.name === contest.competition;});
            
            if(league.multi)
              swiss = {comp: league.name, league: league.name};

            if (league.combine){
              const div = league.combine.find(a => a.additional.find(b => b.name === contest.competition));
              if (div){
                const offset = div.additional.find(b => b.name === contest.competition).offset;

                contest.old_comp = contest.competition;
                //fix competition name
                contest.competition = div.comp;
                //fix round
                contest.round = contest.round + offset;
              }
            }
            contest.season = season.name;
            let shoudlRecalculate = await this._parseNewContest(contest, swiss, null, season.calculation || "normal");    
            let shouldAdd = season.calculation === "hjmc" 
              ? !toUpdate.includes(x => x.league === contest.league && x.season === contest.season ) 
              : !toUpdate.includes(x => x.league === contest.league && x.competition === contest.competition );
            if (shoudlRecalculate && shouldAdd ){
              season.calculation === "hjmc" ? toUpdate.push({league: contest.league, season: contest.season, calc:"hjmc" }) : toUpdate.push({league: contest.league, competition: contest.competition, calc:"normal" });
            }
          } 

          //clean up the cache
          cache.keys().map(function(key){
            if (key.toLowerCase().indexOf(encodeURI(`${league.link.toLowerCase()}`)) >-1) {
              cache.del(key);
            }
          },this);

          //update standings
          for(const update of toUpdate){
            update.calc === "hjmc" ? await tourneyService.calculateStandingsHJMC(update.league, update.season ,update.league) : await standingsService.updateStandings(update.league, update.competition);
          }

          let reg = new RegExp(encodeURI(`${league.name}/${season}`),"i");
          cache.keys().map(key => {
            if (reg.test(key)){
              cache.del(key);
            }
          });
        }
      }
    }
  
    async fixAdminGames(contestId){
      const contest = await dataService.getSchedule({contest_id:parseInt(contestId)});
      
      let season = configurationService.getSeasons()
        .find(x => x.active && x.leagues.filter(l => l.name.toLowerCase() === contest.league.toLowerCase()).length > 0 );
      let league = season.leagues.find(l => l.name.toLowerCase() === contest.league.toLowerCase());
      let combined = league.combine ? league.combine.find(c => c.comp === contest.competition): false;
      let options = {platform:"pc", competition:contest.competition, league:contest.league,round:contest.round, status:"played", exact: 1, limit:20};

      if(combined){
        let x = 0;
        let combine;
        while (combined.additional[x].offset < contest.round-1){
          combine = combined.additional[x];
          x++;
        }
        if (combine){
          options.round = contest.round-combine.offset;
          options.competition = combine.name;
        }
      } 
      


      let contests = await cyanideService.contests(options);

      let matches = contests.upcoming_matches.map(x => x.match_uuid);
      let found = await dataService.getMatches({"uuid":{$in:matches}},{"uuid":1});
      found = found.map(f => f.uuid);

      let newMatches = matches.filter(x => !found.includes(x));

      let data = [];
      await Promise.each(newMatches, async id =>{
        data.push(await cyanideService.match({match_id: id}));
      });


      await Promise.each(data, async m => dataService.insertMatch(m));
      await Promise.each(data, async m => await teamService.updateTeamsAfterMatch(m));
      await Promise.each(contests.upcoming_matches, async c => await this._parseNewContest(c));
      await standingsService.updateStandings(contest.league, contest.competition);

      let reg = new RegExp(encodeURI(`${contest.league}/${contest.season}`),"i");
      cache.keys().map(key => {
        if (reg.test(key)){
          cache.del(key);
        }
      });
    }


    async initRebblData(leagueName, competition){
  
  
      let seasons;
      switch(leagueName){
        case "rebbl":
          seasons = [configurationService.getActiveSeason()];
          break;
        case "oneminute":
          seasons = [configurationService.getActiveOneMinuteSeason()]; 
          break;
        case "lineman":
          seasons = [configurationService.getActiveLinemanSeason()]; 
          break;
        case "beer":
          seasons = [configurationService.getActiveBeerSeason()]; 
          break;
        case "elf":
          seasons = [configurationService.getActiveElflySeason()]; 
          break;
        case "rabble":
          seasons = [configurationService.getActiveRabblSeason()];
          break;
        case "rampup":
          seasons = [configurationService.getActiveRampupSeason()];
          break;
        case "eurogamer":
          seasons = [configurationService.getActiveEurogameSeason()];
          break;
        case "oi":
          seasons = [configurationService.getActiveOISeason()];
          break;
        case "greenhorn":
          seasons = [configurationService.getActiveGreenhornSeason()];
          break;
        case "rookies":
          seasons = [configurationService.getActiveMinorsSeason()];
          seasons = seasons.concat(configurationService.getActiveCollegeSeason());
          seasons = seasons.concat(configurationService.getActiveUpstartSeason());       
          break;          
        default:
          seasons = [configurationService.getActiveSeason()];
          seasons = seasons.concat(configurationService.getActiveOneMinuteSeason());
          seasons = seasons.concat(configurationService.getActiveLinemanSeason());
          seasons = seasons.concat(configurationService.getActiveElflySeason());
          seasons = seasons.concat(configurationService.getActiveOISeason());
          seasons = seasons.concat(configurationService.getActiveGreenhornSeason());
          seasons = seasons.concat(configurationService.getActiveRabblSeason());
          seasons = seasons.concat(configurationService.getActiveRampupSeason());
          seasons = seasons.concat(configurationService.getActiveEurogameSeason());
          seasons = seasons.concat(configurationService.getActiveMinorsSeason());
          seasons = seasons.concat(configurationService.getActiveCollegeSeason());
          seasons = seasons.concat(configurationService.getActiveUpstartSeason());       
          
          break;
      }
  
      try {
        for (let seasonIndex = 0; seasonIndex<seasons.length; seasonIndex++){
          let season = seasons[seasonIndex];
          let leagues = season.leagues;
          
          for(let leagueIndex=0; leagueIndex<leagues.length; leagueIndex++){
            let divLength= leagues[leagueIndex].divisions.length;
            let league = leagues[leagueIndex];
    
            for(let divisionIndex=0; divisionIndex<divLength; divisionIndex++){
              let division = league.divisions[divisionIndex];
    
              if (competition && competition !== division) continue;

              let exact = Object.prototype.hasOwnProperty.call(league,"exact") ? league.exact ? 1 : 0 : 1;
    
              let options = {platform:"pc", league : league.name, competition: division, status:"*", exact: exact};
              console.log(`${league.name} ${division}`);
              
              let contests = await cyanideService.contests(options);
    
    
              if (!contests.upcoming_matches) continue;
    
              await Promise.all(contests.upcoming_matches.map(async function(contest){
                await this._parseContest(contest,null,null,true);
              }, this));
    
    
              await Promise.all(cache.keys().map(function(key){
                if (key.toLowerCase().indexOf(encodeURI(`/${league.link.toLowerCase()}/${division.toLowerCase()}`))>-1){
                  cache.del(key);
                }
                if (key.toLowerCase() === encodeURI(`/rebbl/${league.link.toLowerCase()}`)){
                  cache.del(key);
                }
                if (key.toLowerCase() === encodeURI(`/rebbrl/${league.link.toLowerCase()}`)){
                  cache.del(key);
                }
              },this));
            }
    
            if (league.combine){
                await Promise.all(league.combine.map(async function(comp){
                  await Promise.all(comp.additional.map(async function(additional){
    
                    let options = {platform:"pc", league : league.name, competition: additional.name, status:"*", exact: 1};
                    
                    additional.comp = comp.comp;
    
                    let contests = await cyanideService.contests(options);
          
          
                    if (!contests.upcoming_matches) return;
          
                    await Promise.all(contests.upcoming_matches.map(async function(contest){
                      contest.season = season.name;
                      await this._parseContest(contest,null,additional, true);
                    }, this));
          
    
                  },this));
                },this));
            }
    
          }
        }
      }
      catch (e){
        //todo proper logging
        console.log(e);
      }
    }

    async updateCAS(team1, team2){
      const busts = ["BrokenNeck", "FracturedSkull","SeriousConcussion","SmashedAnkle","SmashedCollarBone","SmashedHip","DamagedBack", "SmashedKnee","Dead"];
      
      const r = (p, c) => {
        for (let cas in c.casualties_sustained)
          if (busts.indexOf(c.casualties_sustained[cas]) > -1 ) p[c.casualties_sustained[cas]]++;
  
        return p;
      };
  
      let cas = team1.roster.reduce(r ,{ "BrokenNeck":0, "FracturedSkull":0,"SeriousConcussion":0,"SmashedAnkle":0,"SmashedCollarBone":0,"SmashedHip":0,"DamagedBack":0,"SmashedKnee":0,"Dead":0 } );
  
  
      cas = team2.roster.reduce(r,cas);
  
      await dataService.updateCasualties({"name":"greenhorn"},{$inc:cas} ,{upsert:true} );
    }
  
    async getCasualties(){
      if (!dataService.isConnected) return;
  
      let data = cache.get("greenhornData");
      if (data) return data;
  
      data = await dataService.getCasualties({"name":"greenhorn"});
      cache.put("greenhornData", data);
  
      return data;
    }
  
    async notifyClients(){
  
      cache.del("greenhornData");
      
      let cas = await this.getCasualties();
  
      cache.put("greenhornData", cas);
  
      this.socket.emit('greenhorn',cas);
    }

}
if (!Promise.each) Promise.each = async (arr, fn) => {for(const item of arr) await fn(item);};

module.exports = new MaintenanceService();