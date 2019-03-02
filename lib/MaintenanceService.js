"use strict";

const
  cache = require("memory-cache")
  , configurationService = require("./ConfigurationService.js")
  , cyanideService = require("./CyanideService.js")
  , dataService = require("./DataService.js").rebbl
  , datingService = require("./DatingService")
  , teamService = require("./teamservice.js");

class MaintenanceService{
    async getMatch(id){
      try {
        let stunties = [6,11,19];
        let exist = await dataService.getMatch({uuid: id});
  
        if (exist) return; //already exists
  
        let match = await cyanideService.match({match_id: id});
  
        // we need to manually correct surfs
        if (match.match.teams[0].roster)
          match.match.teams[0].inflictedpushouts = match.match.teams[0].roster.reduce(function(p,c){ return p + c.stats.inflictedpushouts },0);
        if (match.match.teams[1].roster)
          match.match.teams[1].inflictedpushouts = match.match.teams[1].roster.reduce(function(p,c){ return p + c.stats.inflictedpushouts },0);
  
        if (match){
          dataService.insertMatch(match);
          if(stunties.indexOf(match.match.teams[0].idraces) > -1 && stunties.indexOf(match.match.teams[1].idraces) > -1 ){
            cache.del("/rebbl/stunty");
            cache.del("/api/v1/standings/stunty");
          }
          await teamService.updateTeamsAfterMatch(match);
          
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
  
    async _parseContest(match, swiss, additional){
      
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
  
      let mismatch = (!contestHasWinner && matchHasWinner || (contestHasWinner && matchHasWinner && contest.winner.coach.id !== match.winner.coach.id ));
  
      if ( match.contest_id <= 187525 ){
        return;  
      } else if (!contest) {
        dataService.insertSchedule(match); 
     console.log(match.competition);
      } else if(contest.manual) {
        return;
      } else if (match.status === "played" && contest.match_uuid === null) {
        dataService.updateSchedule({contest_id: match.contest_id}, match);
      } else if (match.status === "played" && mismatch) {
        dataService.updateSchedule({contest_id: match.contest_id}, match);
      } else if (match.status === "scheduled" && match.opponents && ((contest.opponents && (match.opponents[0].coach.id !== contest.opponents[0].coach.id
                 || match.opponents[1].coach.id !== contest.opponents[1].coach.id )) || !contest.opponents) ){
        dataService.updateSchedule({contest_id: match.contest_id}, match);
        cache.del(encodeURI(`/rebbl/match/unplayed/${match.contest_id}`));
      }
  
      if (match.status === "played"){
        datingService.removeDate(match.contest_id);
        await this.getMatch(match.match_uuid);
      } 
    }
  
    async getRebblData(leagueName){
  
      let leagues
      switch(leagueName){
        case "rebbl":
          leagues = configurationService.getActiveSeason().leagues;
          break;
        case "oneminute":
          leagues = configurationService.getActiveOneMinuteSeason().leagues; 
          break;
        case "lineman":
          leagues = configurationService.getActiveLinemanSeason().leagues; 
          break;
        case "elf":
          leagues = configurationService.getActiveElflySeason().leagues; 
          break;
        case "rabble":
          leagues = configurationService.getActiveRabblSeason().leagues;
          break;
        case "rampup":
          leagues = configurationService.getActiveRampupSeason().leagues;
          break;
        case "eurogamer":
          leagues = configurationService.getActiveEurogameSeason().leagues;
          break;
        case "oi":
          leagues = configurationService.getActiveOISeason().leagues;
          break;
        case "greenhorn":
          leagues = configurationService.getActiveGreenhornSeason().leagues;
          break;
        default:
          leagues = configurationService.getActiveSeason().leagues;
          leagues = leagues.concat(configurationService.getActiveOneMinuteSeason().leagues);
          leagues = leagues.concat(configurationService.getActiveLinemanSeason().leagues);
          leagues = leagues.concat(configurationService.getActiveElflySeason().leagues);
          leagues = leagues.concat(configurationService.getActiveOISeason().leagues);
          leagues = leagues.concat(configurationService.getActiveGreenhornSeason().leagues);
          leagues = leagues.concat(configurationService.getActiveRabblSeason().leagues);
          leagues = leagues.concat(configurationService.getActiveRampupSeason().leagues);
          leagues = leagues.concat(configurationService.getActiveEurogameSeason().leagues);
          
          break;
      }
  
      try {
        if (!Promise.each){
          Promise.each = async function(arr, fn) { // take an array and a function
            for(const item of arr) await fn(item);
         }
        }
        await Promise.each(leagues, async league=> {
          const data = await cyanideService.competitions({platform:"pc", league : league.name,limit:250});
  
  
          await Promise.all(data.competitions.map(async competition => {
            let division = competition.name;
            let swiss = null;
            let combine = null;
  
            if (!competition.name) return;
  
            if (league.multi && (competition.name.toLowerCase().indexOf("e-apo") > -1  || competition.name.toLowerCase().indexOf("template") > -1 )) {
              return;
            }
            if (league.multi && /ReBBL Open Invitational/i.test(competition.league.name) && competition.id < 127000 ){
              return;
            }
  
            
  
            if(league.swiss)
              swiss = league.swiss.find(function(a){return a.name === division});
            if(league.multi ){
              let index = division.toLowerCase().indexOf("rd");
              let round =1;
              if (index > 0){
                round = parseInt(division.substr(division.toLowerCase().indexOf("rd")+3,2));
              } else if (division.toLowerCase().indexOf("w") > -1){
                index = division.toLowerCase().indexOf("w");
                round = parseInt(division.substr(division.toLowerCase().indexOf("w")+1,2));
              }
              swiss = {comp: league.name, round:round, league: league.name};
            }
   
  
  
  
            let options = {platform:"pc", league : league.name, competition: competition.name, round: competition.round-1, status:"played", exact: 1, limit:150};
            if(league.multi ){
              let number = 1;
              if (competition.name.toLowerCase().indexOf("game") > -1 ){
                number = parseInt(competition.name.substr(competition.name.toLowerCase().indexOf("game")+5,2));
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
              if (number > 1200){
                options.league = league.name + " 7";
              }
  
            }
  
            console.log(`${league.name} ${division}`);
  
            /* we could have rolled over directly after a match, so double check last weeks matches */
            if (competition.round > 1  || league.name === "RAMPUP"){
              let contests = await cyanideService.contests(options);
              if (contests &&  contests.upcoming_matches){ 
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
  
                  await this._parseContest(contest, swiss);
                }, this));
              }
            }
  
            options = {platform:"pc", league : league.name, competition: division, round: competition.round,  status:"*", exact: 1};
            if(league.multi ){
              let number = 1;
              if (competition.name.toLowerCase().indexOf("game") > -1 ){
                number = parseInt(competition.name.substr(competition.name.toLowerCase().indexOf("game")+5,2));
              }
              else if (competition.name.toLowerCase().indexOf("oi") > -1 )
                 number = parseInt(competition.name.substr(competition.name.toLowerCase().indexOf("oi")+3,2));
              
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
              if (number > 1200){
                options.league = league.name + " 7";
              }
  
            }
  
  
            /* get the current round matches, we ask for status = "*" because swiss matchups only are created until after rollover*/
            let contests = await cyanideService.contests(options);
  
            if (contests.upcoming_matches){
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
          }))
        })
      }
      catch (e){
        //todo proper logging
        console.log(e);
      }
      cache.del("/");
    }
  
    async initRebblData(leagueName, competition){
  
  
      let leagues
      switch(leagueName){
        case "rebbl":
          leagues = configurationService.getActiveSeason().leagues;
          break;
        case "oneminute":
          leagues = configurationService.getActiveOneMinuteSeason().leagues; 
          break;
        case "lineman":
          leagues = configurationService.getActiveLinemanSeason().leagues; 
          break;
        case "elf":
          leagues = configurationService.getActiveElflySeason().leagues; 
          break;
        case "rampup":
          leagues = configurationService.getActiveRampupSeason().leagues; 
          break;
        case "eurogamer":
          leagues = configurationService.getActiveEurogameSeason().leagues;        
        default:
          leagues = configurationService.getActiveSeason().leagues;
          leagues = leagues.concat(configurationService.getActiveOneMinuteSeason().leagues); 
          leagues = leagues.concat(configurationService.getActiveLinemanSeason().leagues); 
          leagues = leagues.concat(configurationService.getActiveElflySeason().leagues); 
          leagues = leagues.concat(configurationService.getActiveRampupSeason().leagues);        
          leagues = leagues.concat(configurationService.getActiveEurogameSeason().leagues);        
          break;
      }
  
      try {
        for(let leagueIndex=0;leagueIndex<leagues.length;leagueIndex++){
          let divLength= leagues[leagueIndex].divisions.length;
          let league = leagues[leagueIndex];
  
          for(let divisionIndex=0;divisionIndex<divLength;divisionIndex++){
            let division = league.divisions[divisionIndex];
  
            if (competition && competition !== division) continue;
  
            let options = {platform:"pc", league : league.name, competition: division, status:"*", exact: 1};
            console.log(`${league.name} ${division}`);
            
            let contests = await cyanideService.contests(options);
  
  
            if (!contests.upcoming_matches) continue;
  
            await Promise.all(contests.upcoming_matches.map(async function(contest){
              await this._parseContest(contest);
            }, this));
  
  
            await Promise.all(cache.keys().map(function(key){
              if (key.toLowerCase().indexOf(encodeURI(`/${league.link.toLowerCase()}/${division.toLowerCase()}`))>-1){
                cache.del(key);
              }
              if (key.toLowerCase() === encodeURI(`/rebbl/${league.link.toLowerCase()}`)){
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
                    await this._parseContest(contest,null,additional);
                  }, this));
        
  
                },this))
              },this));
          }
  
        }
      }
      catch (e){
        //todo proper logging
        console.log(e);
      }
    }
    
    newScore(league, comp, opponent, points, tdDiff){
      return {
          id: opponent.coach.id,
          name: opponent.coach.name,
          league: league,
          competition: comp,
          team: opponent.team.name,
          teamId: opponent.team.id,
          race: opponent.team.race,
          points: points,
          games: 1,
          win: points === 3 ? 1 :0,
          loss: points === 0 ? 1 :0,
          draw: points === 1 ? 1 :0,
          tddiff: tdDiff
      }
    }


    //calculate coach points per league/division
    async calculateStandings() {

      await dataService.removeStandings({});
      
      const res = await dataService.getSchedules({"match_uuid":{$ne:null}});


      let leagues = [...new Set(res.map(schedule => schedule.league))];

      leagues.map(async (league) => {
          let data = await dataService.getSchedules({"league": league});
          let comps = [...new Set(data.map(l => l.competition)  )];


          comps.map(async(competition) => {

              let matches = await dataService.getSchedules({"league": league, "competition":competition, "match_uuid":{$ne:null}});
              let coaches = [];

              await matches.map(match => {

                  if (match.winner){
                      var winner = coaches.find(function (c) {
                          return c.id === match.winner.coach.id 
                        });
                      
                      var loserCoach = coaches.find(function (c) {
                          return c.id === (match.winner.coach.id === match.opponents[0].coach.id ? match.opponents[1].coach.id : match.opponents[0].coach.id)
                      });
                      
                      var loser = match.winner.coach.id === match.opponents[0].coach.id ? match.opponents[1] : match.opponents[0];

                      //process winner
                      if(!winner){
                          winner = this.newScore(league,competition,match.winner,3,match.winner.team.score - loser.team.score); 
                          coaches.push(winner);
                      } else {
                          winner.games++;
                          winner.win++;
                          winner.points += 3;
                          winner.tddiff += (match.winner.team.score  - loser.team.score);
                      }


                      //process loser
                      if(!loserCoach){
                          loserCoach = this.newScore(league,competition,loser,0,loser.team.score-match.winner.team.score); 
                          coaches.push(loserCoach);
                      } else {
                          loserCoach.games++;
                          loserCoach.loss++;
                          loserCoach.tddiff += loser.team.score-match.winner.team.score;
                      }

                  } else {
                      //process both as a draw

                      let coach = coaches.find(function (c) {
                          return c.id === match.opponents[0].coach.id
                      });

                      if (!coach) {
                          if (!match.opponents || !match.opponents[0] ){
                              console.dir(match);
                              return;
                          }
                          coach = this.newScore(league,competition,match.opponents[0],1,0); 
                          coaches.push(coach);
                      } else {
                          coach.games++;
                          coach.points++;
                          coach.draw++;
                      }
              
                      coach = coaches.find(function (c) {
                          return c.id === match.opponents[1].coach.id
                      });
                      if (!coach) {
                          coach = this.newScore(league,competition,match.opponents[1],1,0); 
                          coaches.push(coach);
                      } else {
                          coach.games++;
                          coach.points++;
                          coach.draw++;
                      }
                  }

              });
              if (coaches.length > 0)
                  await dataService.insertStandings(coaches);
          });
      });

    };
}

module.exports = new MaintenanceService();