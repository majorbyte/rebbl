"use strict";

const Datastore = require("./async-nedb.js")
  , fs = require("fs")
  , cyanideService = require("./CyanideService.js")
  , configurationService = require("./ConfigurationService.js")
  , datingService = require("./DatingService.js")
  , accountService = require("./accountService.js")
  , teamService = require("./teamservice.js")
  , cache = require("memory-cache");


class LeagueService{
  constructor(){
    this.matches = new Datastore.datastore("datastore/league-matches.db");
    this.schedule = new Datastore.datastore("datastore/league-schedule.db");

    this.matches.loadDatabase();
    this.schedule.loadDatabase();

    this._rounds = null;
    this.cache = cache;
    this.tempDb = {};
  }


  async rounds(){
    if (this._rounds === null){
      let matches =  await this.schedule.find({});
      this._rounds = await [...new Set(matches.map(item => item.round))];
    }
    return this._rounds;
  }

  async getMatch(id, league, competition){
    try {
      let stunties = [6,11,19];
      let exist = await this.matches.findOne({id: id});

      if (exist) return; //already exists

      let dir = `datastore/${league.replace(/ /g,"")}`;
      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }

      let match = await cyanideService.match({match_id: id});

      let file = `${dir}/${competition.replace(/ /g,"") }.db`;

      if (!this.tempDb[file]){
        this.tempDb[file] = await new Datastore.datastore(file);
        await this.tempDb[file].loadDatabase();
      }

      let db = this.tempDb[file];

      // we need to manually correct surfs
      if (match.match.teams[0].roster)
        match.match.teams[0].inflictedpushouts = match.match.teams[0].roster.reduce(function(p,c){ return p + c.stats.inflictedpushouts },0);
      if (match.match.teams[1].roster)
        match.match.teams[1].inflictedpushouts = match.match.teams[1].roster.reduce(function(p,c){ return p + c.stats.inflictedpushouts },0);

      if (match){
        await db.insert(match);
        await this.matches.insert({id: id, file: file});
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

  async _parseContest(match, swiss){
    
    if(swiss) {
      if(!match.opponents) return;

      match.old_comp = match.competition;
      match.competition = swiss.comp;
      match.round = swiss.round ? swiss.round : match.round+9;
      if(swiss.league){
        match.league = swiss.league;
      }
    }

    let contest = await this.schedule.findOne({contest_id: match.contest_id});

    let contestHasWinner = contest && contest.winner !== null;
    let matchHasWinner = match && match.winner !== null;

    let mismatch = (!contestHasWinner && matchHasWinner || (contestHasWinner && matchHasWinner && contest.winner.coach.id !== match.winner.coach.id ));

    if ( match.contest_id <= 187525 ){
      return;  
    } else if (!contest) {
      await this.schedule.insert(match);
    } else if(contest.manual) {
      return;
    } else if (match.status === "played" && contest.match_uuid === null) {
      await this.schedule.update({contest_id: match.contest_id}, match);
    } else if (match.status === "played" && mismatch) {
      await this.schedule.update({contest_id: match.contest_id}, match);
    } else if (match.status === "scheduled" && match.opponents && ((contest.opponents && (match.opponents[0].coach.id !== contest.opponents[0].coach.id
               || match.opponents[1].coach.id !== contest.opponents[1].coach.id )) || !contest.opponents) ){
      await this.schedule.update({contest_id: match.contest_id}, match);
      cache.del(encodeURI(`/rebbl/match/unplayed/${match.contest_id}`));
    }

    if (match.status === "played"){
      await datingService.removeDate(match.contest_id);
      await this.getMatch(match.match_uuid, match.league, match.competition);
    } 
  }

  async getRebblData(){

    let leagues = configurationService.getActiveSeason().leagues;

    leagues = leagues.concat(configurationService.getActiveOneMinuteSeason().leagues);
    leagues = leagues.concat(configurationService.getActiveLinemanSeason().leagues);
    leagues = leagues.concat(configurationService.getActiveElflySeason().leagues);
    leagues = leagues.concat(configurationService.getActiveOISeason().leagues);
    leagues = leagues.concat(configurationService.getActiveGreenhornSeason().leagues);

    try {

      for(let leagueIndex=0;leagueIndex<leagues.length;leagueIndex++){
        let league = leagues[leagueIndex];

        const competitions = await cyanideService.competitions({platform:"pc", league : league.name,limit:250});

        competitions.competitions.forEach(async function(competition){
          let division = competition.name;
          let swiss = null;

          if (league.multi && (competition.name.toLowerCase().indexOf("e-apo") > -1  || competition.name.toLowerCase().indexOf("template") > -1 )) {
            return;
          }

          if(league.swiss)
            swiss = league.swiss.find(function(a){return a.name === division});
          if(league.name === "RAMPUP") {
            let index = division.toLowerCase().indexOf("week");
            let round =1;
            if (index > 0){
              round = division.substr(division.toLowerCase().indexOf("week")+5,2);
              round = round.replace("!","");
            }
            if (round === "#")  round =1;
            swiss = {comp: division.substr(0,3).toLowerCase() === "rel" ? "REL Rampup" : "GMan Rampup",round:round};//hack
          } 
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
          if (league.name === "RAMPUP"){
            options.league = swiss.comp;
            delete options.round;
          }
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

          }

          console.log(`${league.name} ${division}`);

          /* we could have rolled over directly after a match, so double check last weeks matches */
          if (competition.round > 1  || league.name === "RAMPUP"){
            let contests = await cyanideService.contests(options);
            if (contests &&  contests.upcoming_matches){ 
              await Promise.all(contests.upcoming_matches.map(async function(contest){
                await this._parseContest(contest, swiss);
              }, this));
            }
          }

          options = {platform:"pc", league : league.name, competition: division, round: competition.round,  status:"*", exact: 1};
          if (league.name === "RAMPUP"){
            options.league =  swiss.comp;
            delete options.round;
          }
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

          }


          /* get the current round matches, we ask for status = "*" because swiss matchups only are created until after rollover*/
          let contests = await cyanideService.contests(options);

          if (contests.upcoming_matches){
            await Promise.all(contests.upcoming_matches.map(async function(contest){
              await this._parseContest(contest, swiss);
            }, this));

            if (contests && contests.upcoming_matches && contests.upcoming_matches.length > 0){
              if( swiss) {
                division = swiss.comp;
              }

              await Promise.all(cache.keys().map(function(key){
                if (key.toLowerCase().indexOf(encodeURI(`/${league.link.toLowerCase()}/${division.toLowerCase()}`))>-1){
                  cache.del(key);
                }
                if (key.toLowerCase() === encodeURI(`/rebbl/${league.link.toLowerCase()}`)){
                  cache.del(key);
                }
              },this));
            }
          }
        }.bind(this));
      }

      delete this.tempDb;
      this.tempDb = {};
    }
    catch (e){
      //todo proper logging
      console.log(e);
    }

    //compact databases
    this.matches.loadDatabase();
    this.schedule.loadDatabase();
  }

  async initRebblData(leagueName, comp){


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
      default:
        leagues = configurationService.getActiveSeason().leagues;
        leagues = leagues.concat(configurationService.getActiveOneMinuteSeason().leagues); 
        leagues = leagues.concat(configurationService.getActiveLinemanSeason().leagues); 
        leagues = leagues.concat(configurationService.getActiveElflySeason().leagues); 
        break;
    }

    try {
      for(let leagueIndex=0;leagueIndex<leagues.length;leagueIndex++){
        let divLength= leagues[leagueIndex].divisions.length;
        let league = leagues[leagueIndex];

        for(let divisionIndex=0;divisionIndex<divLength;divisionIndex++){
          let division = league.divisions[divisionIndex];

          if (comp && comp !== division) continue;

          let options = {platform:"pc", league : league.name, competition: division, status:"*", exact: 1};
          if (league === "RAMPUP"){
            options.league = division;
            delete options.competition;
          }
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
      }

      delete this.tempDb;
      this.tempDb = {};
    }
    catch (e){
      //todo proper logging
      console.log(e);
    }

    //compact databases
    this.matches.loadDatabase();
    this.schedule.loadDatabase();
  }

  _groupBy(xs, key) {
    return xs.reduce(function(rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  };

  async getWeeks(leagueRegex, divRegex){

    let matches =  await this.schedule.find({league: {"$regex": leagueRegex}, competition: {"$regex": divRegex}});

    return [...new Set(matches.map(item => item.round))];
  }

  async getDivisions(league){
    let schedules = await this.schedule.find({league: {"$regex": league}});

    return [...new Set(schedules.map(item => item.competition))];
  }

  async getLeagues(param){
    param.opponents = { $ne: null }
    let schedules =  await this.schedule.find(param);

    schedules = schedules.sort(function(a,b){
      return a.contest_id > b.contest_id ? 1 : -1 ;
    });

    return !param.round ? this._groupBy(schedules, "round"): schedules;
  }

  async getLeague(param){
    return await this.schedule.findOne(param);
  }

  async searchLeagues(filter,projection){
    return await this.schedule.find(filter,projection);
  }

  async getCoachScore(league, competition, group) {
    let schedules; 
    
    if(competition){
      let comp = new RegExp(`^${competition}`, "i");
      schedules = await this.schedule.find({league: {"$regex": league},competition: {"$regex": comp}});
    }
    else {
      schedules = await this.schedule.find({league: {"$regex": league}});
    }

    let coachNames = [...new Set(schedules.map(schedule => schedule.opponents ? schedule.opponents[0].coach.name : null))];
    let accounts = await accountService.searchAccounts({"coach":{$in: coachNames}});

    schedules = schedules.sort(function (a, b) {

      if (a.competition > b.competition) return 1;
      if (a.competition < b.competition) return -1;

      return a.contest_id > b.contest_id ? 1 : -1;
    });

    const l = schedules.length;
    let coaches = [];
    let seasons = configurationService.getSeasons();

    schedules.forEach(function (schedule) {
      
      let isConfigured = seasons.find(function(season){ return season.leagues.find(function(league){ 
        let isRampup = schedule.league.toLowerCase().indexOf("rampup") > 0;
        
        return (league.name.toLowerCase() === schedule.league.toLowerCase() 
          && (league.divisions.indexOf(schedule.competition) > -1) || isRampup || league.multi)
        })
      });

      if(!isConfigured) 
        return;
      if (!schedule.match_uuid) 
       return;

      if (schedule.winner) {
        var winner = coaches.find(function (c) {
          return c.id === schedule.winner.coach.id && c.competition === schedule.competition
        });
        if (!winner) {
          winner = {
            id: schedule.winner.coach.id,
            name: schedule.winner.coach.name,
            competition: schedule.competition,
            team: schedule.winner.team.name,
            teamId: schedule.winner.team.id,
            race: schedule.winner.team.race,
            points: 3,
            games: 1,
            win: 1,
            loss: 0,
            draw: 0,
            tddiff: schedule.winner.team.score
          };
          coaches.push(winner);
        } else {
          winner.games++;
          winner.win++;
          winner.points += 3;
          winner.tddiff += schedule.winner.team.score
        }

        if (schedule.winner.coach.id === schedule.opponents[0].coach.id) {
          coach = coaches.find(function (c) {
            return c.id === schedule.opponents[1].coach.id && c.competition === schedule.competition
          });
          if (!coach) {
            coach = {
              id: schedule.opponents[1].coach.id,
              name: schedule.opponents[1].coach.name,
              competition: schedule.competition,
              team: schedule.opponents[1].team.name,
              teamId: schedule.opponents[1].team.id,
              race: schedule.opponents[1].team.race,
              points: 0,
              games: 1,
              win: 0,
              loss: 1,
              draw: 0,
              tddiff: schedule.opponents[1].team.score - schedule.opponents[0].team.score
            };
            coaches.push(coach);
          } else {
            coach.games++;
            coach.loss++;
            coach.tddiff += schedule.opponents[1].team.score - schedule.opponents[0].team.score;
          }
          winner.tddiff -= schedule.opponents[1].team.score;
        } else {
          coach = coaches.find(function (c) {
            return c.id === schedule.opponents[0].coach.id && c.competition === schedule.competition
          });
          if (!coach) {
            coach = {
              id: schedule.opponents[0].coach.id,
              name: schedule.opponents[0].coach.name,
              competition: schedule.competition,
              team: schedule.opponents[0].team.name,
              teamId: schedule.opponents[0].team.id,
              race: schedule.opponents[0].team.race,
              points: 0,
              games: 1,
              win: 0,
              loss: 1,
              draw: 0,
              tddiff: schedule.opponents[0].team.score - schedule.opponents[1].team.score
            };
            coaches.push(coach);
          } else {
            coach.games++;
            coach.loss++;
            coach.tddiff += schedule.opponents[0].team.score - schedule.opponents[1].team.score
          }
          winner.tddiff -= schedule.opponents[0].team.score;
        }

      } else {

        var coach = coaches.find(function (c) {
          return c.id === schedule.opponents[0].coach.id && c.competition === schedule.competition
        });
        if (!coach) {
          coach = {
            id: schedule.opponents[0].coach.id,
            name: schedule.opponents[0].coach.name,
            competition: schedule.competition,
            team: schedule.opponents[0].team.name,
            teamId: schedule.opponents[0].team.id,
            race: schedule.opponents[0].team.race,
            points: 1,
            games: 1,
            win: 0,
            loss: 0,
            draw: 1,
            tddiff: 0
          };
          coaches.push(coach);
        } else {
          coach.games++;
          coach.points++;
          coach.draw++;
        }

        coach = coaches.find(function (c) {
          return c.id === schedule.opponents[1].coach.id && c.competition === schedule.competition
        });
        if (!coach) {
          coach = {
            id: schedule.opponents[1].coach.id,
            name: schedule.opponents[1].coach.name,
            competition: schedule.competition,
            team: schedule.opponents[1].team.name,
            teamId: schedule.opponents[1].team.id,
            race: schedule.opponents[1].team.race,
            points: 1,
            games: 1,
            win: 0,
            loss: 0,
            draw: 1,
            tddiff: 0
          };
          coaches.push(coach);
        } else {
          coach.games++;
          coach.points++;
          coach.draw++;
        }

      }
    });

    coaches.map(coach => coach.account = accounts.find(a => a.coach == coach.name));

    if (group){
      const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: "base"})

      coaches = coaches.sort(function(a,b){
        return collator.compare(a.competition, b.competition);
      });      

      

      let data = this._groupBy(coaches, "competition");

      for(let div in data){
        data[div] = data[div].sort(
          function(a,b){
            //points
            if(a.points > b.points) {return -1} 
            if (b.points > a.points) {return 1} 
            
            //tie-breaker #1 : TD-diff
            if (a.tddiff > b.tddiff) {return -1} 
            if (b.tddiff > a.tddiff) {return 1} 
            
            //tie-breaker #2 : Loss diff
            if(a.loss > b.loss){return 1} 
            if(b.loss > a.loss){return -1} 
            
            //tie-breaker #3 : Head to Head
            let match = schedules.find(function(s) {
              if (!s.opponents) return false;
              return s.competition === a.competition && ((s.opponents[0].coach.id === a.id && s.opponents[1].coach.id === b.id) || (s.opponents[1].coach.id === a.id && s.opponents[0].coach.id === b.id)) });

            if (match && match.winner){
              if (match.winner.coach.id === a.id) return -1;
              if (match.winner.coach.id === b.id) return 1;
            }

            return 0; 
          });
      }
      return data;
    } else{
      return coaches;
    }
  }

  async getCoach(_id, coachId=Number(_id)){
    let schedule = {};
    if(!isNaN(coachId)){
      schedule = await this.schedule.findOne({"opponents.coach.id" : coachId});
      return schedule.opponents.find(function(a){return a.coach.id === coachId}).coach;
    }
    else   {
      let regex = new RegExp(_id,"i");
      schedule = await this.schedule.findOne({"opponents.coach.name" : {$regex:regex}});
      if (schedule)
        return schedule.opponents.find(function(a){return a.coach.name.toLowerCase() === _id.toLowerCase()}).coach;
      return null;  
    }
  }

  async getMatchesForCoach(_id, coachId=Number(_id)){


    switch (coachId){
      case 71817:
      case 40049:
        return await this.getContests({"opponents.coach.id" : coachId, "competition": "Season 8 - Division 1", "league":"REBBL - GMan"});
      case 174392:
        return await this.getContests({"opponents.coach.id" : coachId, "competition": "Season 8 - Division 3", "league":"REBBL - GMan"});
      case 159242:
        return await this.getContests({"opponents.coach.id" : coachId, "competition": "Season 8 - Division 2", "league":"REBBL - REL"});
      case 111960:
        return await this.getContests({"opponents.coach.id" : coachId, "competition": "Season 8 - Division 9B", "league":"REBBL - REL"});
      case 9820:
        return await this.getContests({"opponents.coach.id" : coachId, "competition": "Season 8 Div 1"});
      case 97356:
        return await this.getContests({"opponents.coach.id" : coachId, "competition": "Season 8 Div 3"});
      default:
        return await this.getContests({"opponents.coach.id" : coachId});
    }


  }

  async getContests(predicate){
    return await this.schedule.find(predicate);
  }

  async getMatchDetails(_id, matchId=String(_id)){
    let file = await this.matches.findOne({id: matchId});

    if (!file) {
      let league = await this.schedule.findOne({match_uuid: matchId});
      if (!league) return;
      await this.getMatch(matchId,league.league, league.competition);
      file = await this.matches.findOne({id: matchId});
    };

    if(file && !this.tempDb[file.file]){
      this.tempDb[file.file] = await new Datastore.datastore(file.file);
      await this.tempDb[file.file].loadDatabase();
    }

    let match = await this.tempDb[file.file].findOne({uuid: matchId});

    if (!match) {
      console.log(`${file.file} - ${matchId}`);
      return;
    }

    function _sortPlayers(roster){
      return roster.sort(function(a,b){
        if (a.number > b.number) return 1;
        if (a.number < b.number) return -1;
      });
    }

    match.match.teams[0].roster = _sortPlayers(match.match.teams[0].roster);
    match.match.teams[1].roster = _sortPlayers(match.match.teams[1].roster);

    let rosterSize = Math.max(match.match.teams[1].roster.length, match.match.teams[0].roster.length);
    return  {"match": match.match, rosterSize:rosterSize};
  }

  _round(number, precision) {
    var shift = function (number, precision, reverseShift) {
      if (reverseShift) {
        precision = -precision;
      }
      var numArray = ("" + number).split("e");
      return +(numArray[0] + "e" + (numArray[1] ? (+numArray[1] + precision) : precision));
    };
    return shift(Math.round(shift(number, precision, false)), precision, true);
  }

  async getStuntyStandings(){

    let stunties = ["Ogre","Halfling", "Goblin"];
    let skip = ["B-b-b-b-BYE WEEK!","Fat Bye Week", "Small Concede - Bye Week"];
    let regex = new RegExp(`^Season 9`, "i");

    let schedules = await this.schedule.find({"opponents.team.race" : {$in :stunties}, "competition": {$regex: regex} });

    let coaches = [];

    for(var i=0;i < schedules.length;i++){
      let schedule = schedules[i];
      if (!schedule.match_uuid)  continue;

      let file = await this.matches.findOne({id: schedule.match_uuid});

      if(file && !this.tempDb[file.file]){
        this.tempDb[file.file] = await new Datastore.datastore(file.file);
        await this.tempDb[file.file].loadDatabase();
      }

      let match = await this.tempDb[file.file].findOne({uuid: schedule.match_uuid});

      if (match.match.teams[0].mvp != 1 && match.match.teams[1].mvp != 1 ) continue;

      if (schedule.winner){
        var winner = coaches.find(function(c){return c.id === schedule.winner.coach.id && c.competition === schedule.competition  });
        if (!winner && stunties.indexOf(schedule.winner.team.race) >= 0 && skip.indexOf(schedule.winner.team.name) <0 ){
          winner  = {
            id : schedule.winner.coach.id,
            name: schedule.winner.coach.name,
            competition: schedule.competition,
            team: schedule.winner.team.name,
            teamId: schedule.winner.team.id,
            race: schedule.winner.team.race,
            points: 3,
            games: 1,
            win: 1,
            loss: 0,
            draw: 0,
            tddiff: schedule.winner.team.score
          };
          coaches.push(winner);
        } else if (winner) {
          winner.games++;
          winner.win++;
          winner.points += 3;
          winner.tddiff += schedule.winner.team.score
        }

        if (schedule.winner.coach.id === schedule.opponents[0].coach.id){
          coach = coaches.find(function(c){return c.id === schedule.opponents[1].coach.id && c.competition === schedule.competition});
          if (!coach && stunties.indexOf(schedule.opponents[1].team.race) >= 0 && skip.indexOf(schedule.opponents[1].team.name) <0){
            coach  = {
              id : schedule.opponents[1].coach.id,
              name: schedule.opponents[1].coach.name,
              competition: schedule.competition,
              team: schedule.opponents[1].team.name,
              teamId: schedule.opponents[1].team.id,
              race: schedule.opponents[1].team.race,
              points: 0,
              games: 1,
              win: 0,
              loss: 1,
              draw: 0,
              tddiff:  schedule.opponents[1].team.score - schedule.opponents[0].team.score
            };
            coaches.push(coach);
          } else if(coach){
            coach.games++;
            coach.loss++;
            coach.tddiff += schedule.opponents[1].team.score - schedule.opponents[0].team.score;
          }
          if (winner) winner.tddiff -= schedule.opponents[1].team.score;
        } else {
          coach = coaches.find(function(c){return c.id === schedule.opponents[0].coach.id && c.competition === schedule.competition});
          if (!coach&& stunties.indexOf(schedule.opponents[0].team.race) >= 0 && skip.indexOf(schedule.opponents[0].team.name) <0){
            coach  = {
              id : schedule.opponents[0].coach.id,
              name: schedule.opponents[0].coach.name,
              competition: schedule.competition,
              team: schedule.opponents[0].team.name,
              teamId: schedule.opponents[0].team.id,
              race: schedule.opponents[0].team.race,
              points: 0,
              games: 1,
              win: 0,
              loss: 1,
              draw: 0,
              tddiff: schedule.opponents[0].team.score - schedule.opponents[1].team.score
            };
            coaches.push(coach);
          } else if(coach){
            coach.games++;
            coach.loss++;
            coach.tddiff += schedule.opponents[0].team.score - schedule.opponents[1].team.score
          }
          if (winner) winner.tddiff -= schedule.opponents[0].team.score;
        }

      } else {

        var coach = coaches.find(function(c){return c.id === schedule.opponents[0].coach.id && c.competition === schedule.competition});
        if (!coach && stunties.indexOf(schedule.opponents[0].team.race) >= 0 && skip.indexOf(schedule.opponents[0].team.name) <0){
          coach = {
            id : schedule.opponents[0].coach.id,
            name: schedule.opponents[0].coach.name,
            competition: schedule.competition,
            team: schedule.opponents[0].team.name,
            teamId: schedule.opponents[0].team.id,
            race: schedule.opponents[0].team.race,
            points: 1,
            games: 1,
            win: 0,
            loss: 0,
            draw: 1,
            tddiff: 0
          };
          coaches.push(coach);
        } else if(coach){
          coach.games++;
          coach.points++;
          coach.draw++;
        }

        coach = coaches.find(function(c){return c.id === schedule.opponents[1].coach.id && c.competition === schedule.competition });
        if (!coach && stunties.indexOf(schedule.opponents[1].team.race) >= 0 && skip.indexOf(schedule.opponents[1].team.name) <0){
          coach = {
            id : schedule.opponents[1].coach.id,
            name: schedule.opponents[1].coach.name,
            competition: schedule.competition,
            team: schedule.opponents[1].team.name,
            teamId: schedule.opponents[1].team.id,
            race: schedule.opponents[1].team.race,
            points: 1,
            games: 1,
            win: 0,
            loss: 0,
            draw: 1,
            tddiff: 0
          };
          coaches.push(coach);
        } else if(coach){
          coach.games++;
          coach.points++;
          coach.draw++;
        }

      }
    }

    await Promise.all(coaches.map(function(coach){
      coach.points = this._round(coach.points / coach.games, 2);
    },this), this);

    return coaches.sort(function(a,b){

      if (a.points > b.points) return -1;
      if (b.points > a.points) return 1;

      if (a.tddiff > b.tddiff) return -1;
      if (b.tddiff > a.tddiff) return 1;

      if (a.loss < b.loss) return -1;
      if (b.loss < a.loss) return 1;


      return 0
    });
  };

  async _unplayedMatch(match){
    let regex = new RegExp(`${match.opponents[0].coach.name}`, "i");
    let coach = await accountService.searchAccount({"coach":  {"$regex": regex}});
    let team = await teamService.getTeam(match.opponents[0].team.name);
    match.opponents[0].coach = Object.assign(match.opponents[0].coach, coach);
    match.opponents[0].team =  Object.assign(match.opponents[0].team, team);

    regex = new RegExp(`${match.opponents[1].coach.name}`, "i");
    coach = await accountService.searchAccount({"coach":  {"$regex": regex}});
    team = await teamService.getTeam(match.opponents[1].team.name);
    match.opponents[1].coach = Object.assign(match.opponents[1].coach, coach);
    match.opponents[1].team =  Object.assign(match.opponents[1].team, team);

    match.date = await datingService.getDate(match.contest_id);

    return match;
  }

  async getUpcomingMatch(_redditUser, user=String(_redditUser)){

    const account = await accountService.getAccount(user);

    let regex = new RegExp(`${account.coach}`, "i");
    let schedules = await this.schedule.find({"opponents.coach.name": {"$regex": regex}, "status":"scheduled"} );

    for(let i = schedules.length-1; i>0;i--){
      if(regex.test(schedules[i].opponents[0].coach.name) ){
        if(/^\[admin].+/i.test(schedules[i].opponents[0].team.name)){
          schedules.splice(i,1);
          continue;
        }
      }

      if (regex.test(schedules[i].opponents[1].coach.name)){
        if(/^\[admin].+/i.test(schedules[i].opponents[1].team.name)){
          schedules.splice(i,1);
        }
      }
    }



    schedules = schedules.sort(function(a,b){
      return a.round > b.round ? 1 : a.round < b.round ? -1 : 0;
    });

    schedules = this._groupBy(schedules, "competition");

    let matches = [];

    for(let key in schedules){

      let match = await this._unplayedMatch(schedules[key][0])
      match.date = await datingService.getDate(match.contest_id);
      matches.push(match);
    }

    return matches;
  }

  async getUnplayedMatch(_contestId, contestId=Number(_contestId)){
    let match = await this.schedule.findOne({contest_id: contestId});

    return [await this._unplayedMatch(match)];    
  }

  async updateContest(criteria, data){

    await this.schedule.update(criteria, data);

  }

  async rel9fix() {
    let rel9ex = new RegExp("^REL9 Swiss", "i");
    let rel9fix = await this.schedule.find({"competition":{$regex:rel9ex},"status":"played"});
    if(rel9fix){

      rel9fix.map(async function(schedule){

        let round = parseInt(schedule.competition.slice(-1)) + 9;
        this.schedule.update({"match_id":schedule.match_id},{$set:{"competition":"Season 9 - Division 9", round:round}});

      }.bind(this));

    }
    let schedule = await this.schedule.findOne({"competition":"REL9 R4W1","status":"played"});
    if(schedule){
      this.schedule.update({"match_id":schedule.match_id},{$set:{"competition":"Season 9 - Division 9", round:10}});
    }
    schedule = await this.schedule.findOne({"contest_id":499366});
    if(schedule){
      this.schedule.update({"match_id":schedule.match_id},{$set:{"competition":"Season 9 - Division 9", round:12}});
    }
    

    let fix = {
      "match_uuid":"1000511d35"
      , "match_id":5315893
      , "status":"played"
      , "round":11
      , "competition":"Season 9 - Division 9"
      , "opponents":[{"coach":{"id":52682,"name":"ArchXL","twitch":null,"youtube":null,"country":"gb","lang":"english"},"team":{"id":2336490,"name":"[Admin] ByeWeekDrnknggame","logo":"Dwarf_09","value":1200,"motto":"","score":0,"death":0,"race":"Dwarf"}},{"coach":{"id":176615,"name":"Daffo97","twitch":null,"youtube":null,"country":"gb","lang":"english"},"team":{"id":2112947,"name":"Frosting & Filling","logo":"Norse_10","value":1650,"motto":"Chhhhhuuuuugaaaaaaaaaarrrrrr !!!!","score":1,"death":0,"race":"Norse"}}]
      , "winner":{"coach":{"id":176615,"name":"Daffo97","twitch":null,"youtube":null,"country":"gb","lang":"english"},"team":{"id":2112947,"name":"Frosting & Filling","logo":"Norse_10","value":1650,"motto":"","score":1,"death":0,"race":"Norse"},"index":1}
    }; //R2W2    

    schedule  = await this.schedule.findOne({"contest_id":492332});
    if(schedule){
      this.schedule.update({"contest_id":492332},{$set:fix});
      this.getMatch("1000511d35","REBBL - REL","Season 9 - Division 9")
    }

    cache.del(encodeURI("/api/v1/standings/REL"));
    cache.del(encodeURI("/rebbl/REL"));
    cache.del(encodeURI("/rebbl/REL/Season%209%20-%20Division%209"));
  }
}

module.exports = new LeagueService();