"use strict";

const Datastore = require('./async-nedb.js')
  , fs = require('fs')
  , cyanideService = require('./CyanideService.js')
  , configurationService = require('./ConfigurationService.js')
  , accountService = require('./accountService.js')
  , teamService = require('./teamservice.js')
  , cache = require('memory-cache');


class LeagueService{
  constructor(){
    this.matches = new Datastore.datastore('datastore/league-matches.db');
    this.schedule = new Datastore.datastore('datastore/league-schedule.db');

    this.matches.loadDatabase();
    this.schedule.loadDatabase();

    this._rounds = null;

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


      let match = await cyanideService.match({match_id: id});

      // we need to manually correct surfs
      match.match.teams[0].inflictedpushouts = match.match.teams[0].roster.reduce(function(p,c){ return p + c.stats.inflictedpushouts },0);
      match.match.teams[1].inflictedpushouts = match.match.teams[1].roster.reduce(function(p,c){ return p + c.stats.inflictedpushouts },0);

      if (match){
        await db.insert(match);
        await this.matches.insert({id: id, file: file});
        if(stunties.indexOf(match.match.teams[0].idraces) > -1 && stunties.indexOf(match.match.teams[1].idraces) > -1 ){
          cache.del('/rebbl/stunty');
        }
        await teamService.updateTeamsAfterMatch(match);
        cache.del(encodeURI('/api/v1/standings/Big O'));
        cache.del(encodeURI('/api/v1/standings/REL'));
        cache.del(encodeURI('/api/v1/standings/GMan'));
      }
    } catch(e) {
      console.log(e);
    }
  }

  async _parseContest(match, swiss){
    
    if(swiss) {
      if(!match.opponents) return;

      match.competition = swiss.comp;
      match.round = match.round+9;
    }

    let contest = await this.schedule.findOne({contest_id: match.contest_id});

    if (!contest) {
      await this.schedule.insert(match);
    } else if (match.status === "played" && contest.match_uuid === null) {
      await this.schedule.update({contest_id: match.contest_id}, match);
    } else if (match.status === "scheduled" && (match.opponents[0].coach.id !== contest.opponents[0].coach.id
               || match.opponents[1].coach.id !== contest.opponents[1].coach.id )){
      await this.schedule.update({contest_id: match.contest_id}, match);
    }

    if (match.status === "played") await this.getMatch(match.match_uuid, match.league, match.competition);
  }

  async getRebblData(){

    let leagues = configurationService.getActiveSeason().leagues;

    try {

      for(let leagueIndex=0;leagueIndex<leagues.length;leagueIndex++){
        let league = leagues[leagueIndex];

        const competitions = await cyanideService.competitions({platform:"pc", league : league.name});

        competitions.competitions.forEach(async function(competition){
          let division = competition.name;
          let swiss = league.swiss.find(function(a){return a.name === division});
          /* we could have rolled over directly after a match, so double check last weeks matches */
          if (competition.round > 1){
            let contests = await cyanideService.contests({platform:"pc", league : league.name, competition: competition.name, round: competition.round-1, status:"played", exact: 1, limit:150});

            if (contests.upcoming_matches){ 
              await Promise.all(contests.upcoming_matches.map(async function(contest){
                await this._parseContest(contest, swiss);
              }, this));
            }
          }

          /* get the current round matches, we ask for status = '*' because swiss matchups only are created until after rollover*/
          let contests = await cyanideService.contests({platform:"pc", league : league.name, competition: division, round: competition.round,  status:"*", exact: 1});

          if (contests.upcoming_matches){
            await Promise.all(contests.upcoming_matches.map(async function(contest){
              await this._parseContest(contest, swiss);
            }, this));

            if (contests && contests.upcoming_matches && contests.upcoming_matches.length > 0){
              if( swiss) {
                division = swiss.comp;
              }

              await Promise.all(cache.keys().map(function(key){
                if (key.indexOf(encodeURI(`/${league.link}/${division}`))>-1){
                  cache.del(key);
                }
              },this));
              cache.del(encodeURI(`/rebbl/${league.link}`));
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

  async initRebblData(){

    let leagues = configurationService.getActiveSeason().leagues;

    try {
      for(let leagueIndex=0;leagueIndex<leagues.length;leagueIndex++){
        let divLength= leagues[leagueIndex].divisions.length;
        let league = leagues[leagueIndex];

        for(let divisionIndex=0;divisionIndex<divLength;divisionIndex++){
          let division = league.divisions[divisionIndex];
          console.log(`${league.name} ${division}`);
          
          let contests = await cyanideService.contests({platform:"pc", league : league.name, competition: division, status:"*", exact: 1});


          if (!contests.upcoming_matches) continue;

          await Promise.all(contests.upcoming_matches.map(async function(contest){
            await this._parseContest(contest);
          }, this));


          await Promise.all(cache.keys().map(function(key){
            if (key.indexOf(encodeURI(`/${league.link}/${division}`))>-1){
              cache.del(key);
            }
          },this));
          cache.del(encodeURI(`/rebbl/${league.link}`));
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

  async getWeeks(league, competittion){
    let leagueRegex = new RegExp(`${league}`, 'i');
    let divRegex = new RegExp(`${competittion}`, 'i');
    let matches =  await this.schedule.find({league: {"$regex": leagueRegex}, competition: {"$regex": divRegex}});

    return [...new Set(matches.map(item => item.round))];
  }

  async getDivisions(league){
    let regex = new RegExp(`${league}`, 'i');
    let schedules = await this.schedule.find({league: {"$regex": regex}});

    return [...new Set(schedules.map(item => item.competition))];
  }

  async getLeagues(param){
    let schedules =  await this.schedule.find(param);

    schedules = schedules.sort(function(a,b){
      return a.contest_id > b.contest_id ? 1 : -1 ;
    });

    return !param.round ? this._groupBy(schedules, 'round'): schedules;
  }

  async getLeague(param){
    return await this.schedule.findOne(param);
  }

  async searchLeagues(filter,projection){
    return await this.schedule.find(filter,projection);
  }

  async getCoachScore(league, group) {
    let regex = new RegExp(`${league}`, 'i');
    let schedules = await this.schedule.find({league: {"$regex": regex}});

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
        return league.name.toLowerCase() === schedule.league.toLowerCase() 
          && league.divisions.indexOf(schedule.competition) > -1
        })
      });

      if(!isConfigured) return;
      if (!schedule.match_uuid)  return;

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
    if (group){
      coaches = coaches.sort(function(a,b){
        if (a.competition.replace('10','') > b.competition.replace('10','')) return 1;
        else if (a.competition.replace('10','') < b.competition.replace('10','')) return -1;
        return 0; 
      });      
      return this._groupBy(coaches, 'competition');
    } else{
      return coaches;
    }
  }

  async getCoach(_id, coachId=Number(_id)){
    let schedule = await this.schedule.findOne({"opponents.coach.id" : coachId});
    let coach = schedule.opponents.find(function(a){return a.coach.id === coachId}).coach;
    return  coach;
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

    if (!file) return;

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

    let stunties = ['Ogre','Halfling', 'Goblin'];
    let skip = ['B-b-b-b-BYE WEEK!','Fat Bye Week', 'Small Concede - Bye Week'];
    let schedules = await this.schedule.find({"opponents.team.race" : {$in :stunties}});

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

  async getUpcomingMatch(_redditUser, user=String(_redditUser)){

    const account = await accountService.getAccount(user);

    let schedules = await this.schedule.find({"opponents.coach.name": account.coach, "status":"scheduled"});
    schedules = schedules.sort(function(a,b){
      return a.round > b.round ? 1 : -1;
    })

    let match = schedules[0];

    let regex = new RegExp(`${match.opponents[0].coach.name}`, 'i');
    let coach = await accountService.searchAccount({"coach":  {"$regex": regex}});
    match.opponents[0].coach = Object.assign(match.opponents[0].coach, coach);

    regex = new RegExp(`${match.opponents[1].coach.name}`, 'i');
    coach = await accountService.searchAccount({"coach":  {"$regex": regex}});
    match.opponents[1].coach = Object.assign(match.opponents[1].coach, coach);

    return match;
  }
}

module.exports = new LeagueService();