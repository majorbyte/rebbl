"use strict";

const Datastore = require('./async-nedb.js')
  , Cyanide= require('./cyanide.js')
  , cache = require('memory-cache');


class LeagueHandler{
  constructor(){
    this.matches = new Datastore.datastore('datastore/league-matches.db');
    this.schedule = new Datastore.datastore('datastore/league-schedule.db');
    this.coaches = new Datastore.datastore('datastore/league-coaches.db');
    this.teams = new Datastore.datastore('datastore/league-teams.db');

    this.matches.loadDatabase();
    this.schedule.loadDatabase();
    this.coaches.loadDatabase();
    this.teams.loadDatabase();

    this.cyanide = new Cyanide();
    this._rounds = null;
  }


  async rounds(){
    if (this._rounds === null){
      let matches =  await this.schedule.find({});
      this._rounds = await [...new Set(matches.map(item => item.round))];
    }
    return this._rounds;
  }

  async getMatch(id){
    try {

      let exist = await this.matches.findOne({uuid: id});

      if (exist) return; //already exists

      let match = await this.cyanide.match({match_id: id});

      await this.matches.insert(match);

      /*await this.updateCoachScoringPoints(match.coaches[0].id);
      await this.updateCoachScoringPoints(match.coaches[1].id);

      cache.del(`__coach__/coach/${match.coaches[0].id}`);
      cache.del(`__coach__/coach/${match.coaches[1].id}`);
      cache.del(`__coach__/coach`);

      cache.del(`__match__/match/${id}`);*/

    } catch(e) {
      //todo proper logging
      console.log(e);
    }
  }

  async saveCoach(opponent){

    let exits = await this.coaches.findOne({id: opponent.coach.id});

    if (exits) return;

    //not found --> save coach
    const team = Object.assign({}, opponent.team);
    delete team.score;
    delete team.death;

    const coach = Object.assign({}, opponent.coach);
    coach.team = team;
    coach.score = 0;
    coach.touchdownDiff = 0;
    await this.coaches.insert(coach);
  }


  async _parseContest(match, round){
    if(round) match.round = round;

    //Find & save the home coach
    //await this.saveCoach(match.opponents[0]);

    //Save the away coach
    //await this.saveCoach(match.opponents[1]);

    let contest = await this.schedule.findOne({contest_id: match.contest_id});

    if (!contest) {
      await this.schedule.insert(match);
    } else if (match.status === "played" && contest.match_uuid === "1000000000") {
      await this.schedule.update({contest_id: match.contest_id}, match);
    }

    if (match.match_uuid === "1000000000" ) return; //not played yet

    //await this.getMatch(match.match_uuid);
  }

  async getLeagueData(round){
    try {
      const contests = await this.cyanide.contests({league : "ReBBL World Cup 2018", status:"*", exact: 0});

      await Promise.all(contests.upcoming_matches.map(async function(contest){
        await this._parseContest(contest, round);
      }, this));

      //
      cache.del(`__round__/round/${round}`);
    }
    catch (e){
      //todo proper logging
      console.log(e);
    }

    //compact databases
    this.matches.loadDatabase();
    this.schedule.loadDatabase();
    this.coaches.loadDatabase();
    this.teams.loadDatabase();
  }

  async getRebblData(){

    let gman = ['Season 8 - Division 1',
      'Season 8 - Division 2',
      'Season 8 - Division 3',
      'Season 8 - Division 4',
      'Season 8 - Division 5',
      'Season 8 - Division 6A',
      'Season 8 - Division 6B',
      'Season 8 - Division 6C',
      'Season 8 - Division 6D',
      'Season 8 - Division 6E'];
    let rel = ['Season 8 - Division 1',
      'Season 8 - Division 2',
      'Season 8 - Division 3',
      'Season 8 - Division 4',
      'Season 8 - Division 5',
      'Season 8 - Division 6',
      'Season 8 - Division 7',
      'Season 8 - Division 8',
      'Season 8 - Division 9A',
      'Season 8 - Division 9B',
      'Season 8 - Division 9C',
      'Season 8 - Division 9D',
      'Season 8 - Division 9E'];
    let bigO = ['Season 8 Div 1',
      'Season 8 Div 2',
      'Season 8 Div 3',
      'Season 8 Div 4A',
      'Season 8 Div 4B'];

    let gmanUpdated = false, bigOUpdated = false, relUpdated = false;

    try {
      for(let i=0;i<gman.length;i++){
        //console.log(`processing gman: ${gman[i]}`);
        const contests = await this.cyanide.contests({league : "REBBL - GMAN", status:"*", exact: 1, competition: gman[i]});

        await Promise.all(contests.upcoming_matches.map(async function(contest){
          await this._parseContest(contest);
        }, this));

        if (contests.length > 0 ){
          await Promise.all(cache.keys().map(function(key){
            if (key.indexOf(encodeURI(`__league__/league/GMan/${gman[i].replace('Season 8 - ','')}`))>-1){
              cache.del(key);
            }
          },this));
          gmanUpdated =true;
        }
      }

      if(gmanUpdate){
        cache.del(`__league__/league/GMan`);
      }

      for(let i=0;i<rel.length;i++){
        //console.log(`processing rel: ${rel[i]}`);
        const contests = await this.cyanide.contests({league : "REBBL - REL", status:"*", exact: 1, competition: rel[i]});

        await Promise.all(contests.upcoming_matches.map(async function(contest){
          await this._parseContest(contest);
        }, this));

        if (contests.length > 0 ){
          await Promise.all(cache.keys().map(function(key){
            if (key.indexOf(encodeURI(`__league__/league/REL/${rel[i].replace('Season 8 - ','') }`))>-1){
              cache.del(key);
            }
          },this));
          relUpdated = true;
        }
      }

      if(relUpdated){
        cache.del(`__league__/league/REL`);
      }


      for(let i=0;i<bigO.length;i++){
        //console.log(`processing bigO: ${bigO[i]}`);
        const contests = await this.cyanide.contests({league : "REBBL - Big O", status:"*", exact: 1, competition: bigO[i]});

        await Promise.all(contests.upcoming_matches.map(async function(contest){
          await this._parseContest(contest);
        }, this));

        if (contests.length > 0 ){
          await Promise.all(cache.keys().map(function(key){
            if (key.indexOf(encodeURI(`__league__/league/Big O/${bigO[i]}`))>-1){
              cache.del(key);
            }
          },this));
          bigOUpdated = true;
        }
      }

      if(bigOUpdated){
        cache.del(encodeURI(`__league__/league/Big O`));
      }

    }
    catch (e){
      //todo proper logging
      console.log(e);
    }

    //compact databases
    this.matches.loadDatabase();
    this.schedule.loadDatabase();
    this.coaches.loadDatabase();
    this.teams.loadDatabase();
  }

  _groupBy(xs, key) {
    return xs.reduce(function(rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  };

  async getWeeks(league, competittion){
    let matches =  await this.schedule.find({league: league, competition: competittion});

    return [...new Set(matches.map(item => item.round))];
  }

  async getDivisions(league){
    let schedules =  await this.schedule.find({league: league});

    return [...new Set(schedules.map(item => item.competition.replace("Season 8 - ","")))];
  }

  async getLeagues(param){
    let schedules =  await this.schedule.find(param);

    schedules = schedules.sort(function(a,b){
      return a.contest_id > b.contest_id ? 1 : -1 ;
    });

    return !param.round ? this._groupBy(schedules, 'round'): schedules;
  }

  async getCoachScore(league){
    let schedules =  await this.schedule.find({league: league});

    schedules = schedules.sort(function(a,b){

      if(a.competition > b.competition) return 1;
      if(a.competition < b.competition) return -1;

      return  a.contest_id > b.contest_id ? 1 : -1 ;
    });


    const l = schedules.length;
    let coaches = [];
    schedules.forEach(function(schedule){

      if (!schedule.match_uuid || schedule.match_uuid === "1000000000" )  return;

      if (schedule.winner){
        var winner = coaches.find(function(c){return c.id === schedule.winner.coach.id && c.competition === schedule.competition  });
        if (!winner){
          winner  = {
            id : schedule.winner.coach.id,
            name: schedule.winner.coach.name,
            competition: schedule.competition,
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

        if (schedule.winner.coach.id === schedule.opponents[0].coach.id){
          coach = coaches.find(function(c){return c.id === schedule.opponents[1].coach.id && c.competition === schedule.competition});
          if (!coach){
            coach  = {
              id : schedule.opponents[1].coach.id,
              name: schedule.opponents[1].coach.name,
              competition: schedule.competition,
              points: 0,
              games: 1,
              win: 0,
              loss: 1,
              draw: 0,
              tddiff:  schedule.opponents[1].team.score - schedule.opponents[0].team.score
            };
            coaches.push(coach);
          } else {
            coach.games++;
            coach.loss++;
            coach.tddiff += schedule.opponents[1].team.score - schedule.opponents[0].team.score;
          }
          winner.tddiff -= schedule.opponents[1].team.score;
        } else {
          coach = coaches.find(function(c){return c.id === schedule.opponents[0].coach.id && c.competition === schedule.competition});
          if (!coach){
            coach  = {
              id : schedule.opponents[0].coach.id,
              name: schedule.opponents[0].coach.name,
              competition: schedule.competition,
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

        var coach = coaches.find(function(c){return c.id === schedule.opponents[0].coach.id && c.competition === schedule.competition});
        if (!coach){
          coach = {
            id : schedule.opponents[0].coach.id,
            name: schedule.opponents[0].coach.name,
            competition: schedule.competition,
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

        coach = coaches.find(function(c){return c.id === schedule.opponents[1].coach.id && c.competition === schedule.competition });
        if (!coach){
          coach = {
            id : schedule.opponents[1].coach.id,
            name: schedule.opponents[1].coach.name,
            competition: schedule.competition,
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
    return this._groupBy(coaches, 'competition');
  }

  async getCoach(_id, coachId=Number(_id)){
    let coach = await this.coaches.findOne({id: coachId});
    let team = await this.teams.findOne({"coach.id": coachId});
    let matches = await this.schedule.find({"opponents.coach.id" : coachId});

    return {coach: coach, matches: matches, team: team};
  }

  async getMatches(_id, round=Number(_id)){
    let matches = await this.schedule.find({round: round});

    matches = await matches.sort(function(a,b){
      if (a.match_uuid < b.match_uuid ) return 1;
      if (b.match_uuid < a.match_uuid) return -1;
      return 0;
    });

    return {matches: matches};
  }

  async getMatchDetails(_id, matchId=String(_id)){
    let match = await this.matches.findOne({uuid: matchId});

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
}

module.exports = new LeagueHandler();