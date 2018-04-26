"use strict";

const Datastore = require('./async-nedb.js')
  , fs = require('fs')
  , Cyanide= require('./cyanide.js')
  , cache = require('memory-cache');


class LeagueHandler{
  constructor(){
    this.matches = new Datastore.datastore('datastore/league-matches.db');
    this.schedule = new Datastore.datastore('datastore/league-schedule.db');
    this.teams = new Datastore.datastore('datastore/league-teams.db');

    this.matches.loadDatabase();
    this.schedule.loadDatabase();
    this.teams.loadDatabase();

    this.cyanide = new Cyanide();
    this._rounds = null;

    this.tempDb = {};
    this.swiss = ['Season 8 - 6C Swiss', 'Season 8 Div 4A Swiss', 'Season 8 Div 4B Swiss', 'Season 8 Division 8 Swiss'];
    this.swissDiv = ['Season 8 - Division 6C', 'Season 8 Div 4A', 'Season 8 Div 4B', 'Season 8 - Division 8'];
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

      let exist = await this.matches.findOne({id: id});

      if (exist) return; //already exists

      let dir = `datastore/${league.replace(/ /g,'')}`;
      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }

      let file = `${dir}/${competition.replace(/ /g,'') }.db`;

      if (!this.tempDb[file]){
        this.tempDb[file] = await new Datastore.datastore(file);
        await this.tempDb[file].loadDatabase();
      }

      let db = this.tempDb[file];


      let match = await this.cyanide.match({match_id: id});

      if (match){
        await db.insert(match);
        await this.matches.insert({id: id, file: file});
      }

    } catch(e) {
      //todo proper logging
      console.log(e);
    }
  }


  async _parseContest(match){
    let index =this.swiss.indexOf(match.competition); 
    if( index >= 0) {
      if(!match.opponents) return;

      match.competition = this.swissDiv[index];
      match.round = match.round+9;
    }

    let contest = await this.schedule.findOne({contest_id: match.contest_id});

    if (!contest) {
      await this.schedule.insert(match);
    } else if (match.status === "played" && !contest.match_uuid) {
      await this.schedule.update({contest_id: match.contest_id}, match);
    } else if (match.status === "scheduled" && (match.opponents[0].coach.id !== contest.opponents[0].coach.id
               || match.opponents[1].coach.id !== contest.opponents[1].coach.id )){
      await this.schedule.update({contest_id: match.contest_id}, match);
    }

    if (contest && !contest.match_uuid) return; //not played yet

    if (match.status === "played") await this.getMatch(match.match_uuid, match.league, match.competition);
  }

  async getRebblData(round){

    let leagues = [{name : "REBBL - GMAN", link: "GMan", divisions: ['Season 8 - Division 1',
      'Season 8 - Division 2',
      'Season 8 - Division 3',
      'Season 8 - Division 4',
      'Season 8 - Division 5',
      'Season 8 - Division 6A',
      'Season 8 - Division 6B',
      'Season 8 - Division 6C',
      'Season 8 - Division 6D',
      'Season 8 - Division 6E',
      'Season 8 - 6C Swiss']},
      {name: "REBBL - REL", link: "REL", divisions: ['Season 8 - Division 1',
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
        'Season 8 - Division 9E',
        'Season 8 Division 8 Swiss']},
      {name: "REBBL - Big O", link: "Big O", divisions:['Season 8 Div 1',
        'Season 8 Div 2',
        'Season 8 Div 3',
        'Season 8 Div 4A',
        'Season 8 Div 4B',
        'Season 8 Div 4A Swiss',
        'Season 8 Div 4B Swiss']}];



    try {
      for(let leagueIndex=0;leagueIndex<leagues.length;leagueIndex++){
        let divLength= leagues[leagueIndex].divisions.length;
        let league = leagues[leagueIndex];
        for(let divisionIndex=0;divisionIndex<divLength;divisionIndex++){
          let division = league.divisions[divisionIndex];
          let contests;

          if (round){
            if (this.swiss.indexOf(division) >=0) round = round-9;
            contests = await this.cyanide.contests({platform:"pc", league : league.name, competition: division, round: round-1, status:"played", exact: 1, limit:150});

            if (!contests.upcoming_matches) continue;

            await Promise.all(contests.upcoming_matches.map(async function(contest){
              await this._parseContest(contest);
            }, this));

            contests = await this.cyanide.contests({platform:"pc", league : league.name, competition: division, round: round,  status:"*", exact: 1});
          } else {
            contests = await this.cyanide.contests({platform:"pc", league : league.name, competition: division, status:"*", exact: 1});
          }

          if (!contests.upcoming_matches) continue;

          await Promise.all(contests.upcoming_matches.map(async function(contest){
            await this._parseContest(contest);
          }, this));

          if (contests && contests.upcoming_matches && contests.upcoming_matches.length > 0){
            await Promise.all(cache.keys().map(function(key){
              if (key.indexOf(encodeURI(`/${league.link}/${division}`))>-1){
                cache.del(key);
              }
            },this));
            cache.del(encodeURI(`/rebbl/${league.link}`));
          }
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

    return [...new Set(schedules.map(item => item.competition))];
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

      if (!schedule.match_uuid)  return;

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
    let file = await this.matches.findOne({id: matchId});

    if(file && !this.tempDb[file.file]){
      this.tempDb[file.file] = await new Datastore.datastore(file.file);
      await this.tempDb[file.file].loadDatabase();
    }

    let match = await this.tempDb[file.file].findOne({uuid: matchId});

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