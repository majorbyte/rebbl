"use strict";

const 
    configurationService = require("./ConfigurationService.js")
  , cyanideService = require("./CyanideService.js")
  , dataService = require('./DataService.js').rebbl
  , datingService = require("./DatingService.js")
  , accountService = require("./accountService.js")
  , teamService = require("./teamservice.js")
  , cache = require("memory-cache");


class LeagueService{
  constructor(){
    this.cache = cache;
  }


  _groupBy(xs, key) {
    return xs.reduce(function(rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  };

  async getWeeks(leagueRegex, divRegex){

    let matches =  await dataService.getSchedules({league: {"$regex": leagueRegex}, competition: {"$regex": divRegex}});

    return [...new Set(matches.map(item => item.round))];
  }

  async getDivisions(league){
    let schedules = await dataService.getSchedules({league: {"$regex": league}});

    return [...new Set(schedules.map(item => item.competition))];
  }

  async getLeagues(param){
    param.opponents = { $ne: null }
    let schedules =  await dataService.getSchedules(param);

    schedules = schedules.sort(function(a,b){
      return a.contest_id > b.contest_id ? 1 : -1 ;
    });

    return !param.round ? this._groupBy(schedules, "round"): schedules;
  }

  async getLeague(param){
    return await dataService.getSchedule(param);
  }

  async searchLeagues(filter,projection){
    return await dataService.getSchedules(filter,projection);
  }

  originalFind(filter){
    return dataService.getSchedulesChain(filter);
  }

  async getCoachScore(league, competition, group, season) {
    let schedules; 
    
    if(competition){
      let comp = new RegExp(`^${competition}`, "i");
      if (season !== "")
        schedules = await dataService.getSchedules({league: {"$regex": league},competition: {"$regex": comp},season:season});
      else
        schedules = await dataService.getSchedules({league: {"$regex": league},competition: {"$regex": comp}});

      if (competition === "Play-Ins Qualifier"){
        schedules.map(s => s.competition = "Play-Ins Qualifier");
      }
    }
    else {
      if (season !== "")
        schedules = await dataService.getSchedules({league: {"$regex": league},season:season});
      else
        schedules = await dataService.getSchedules({league: {"$regex": league}});
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
      let isConfigured = seasons.find(function(season){ return season.leagues.find(function(l){ 
        let isRampup = schedule.league.toLowerCase().indexOf("rampup") > 0;
        
        if(!l.link) return false;

        return (l.name.toLowerCase() === schedule.league.toLowerCase()  && (l.divisions.indexOf(schedule.competition) > -1)) 
        ||  (l.name.toLowerCase() === schedule.league.toLowerCase()  && isRampup) 
        || (l.name.toLowerCase() === schedule.league.toLowerCase()  && l.multi)
        || (l.link.toLowerCase() === "playins - s10" && competition === "Play-Ins Qualifier")

        })
      });

      if(!isConfigured) 
        return;
      if (!schedule.match_uuid) {
        if (schedule.opponents) {
          let coach = coaches.find(function (c) {
            return c.id === schedule.opponents[0].coach.id && c.competition === schedule.competition
          });
          if (!coach && schedule.opponents[0].coach.id !== null){
            coach = {
              id: schedule.opponents[0].coach.id,
              name: schedule.opponents[0].coach.name,
              competition: schedule.competition,
              season: isConfigured.name,
              team: schedule.opponents[0].team.name,
              teamId: schedule.opponents[0].team.id,
              race: schedule.opponents[0].team.race,
              points: 0,
              games: 0,
              win: 0,
              loss: 0,
              draw: 0,
              tddiff: 0,
              strength: 0,
              strengthOfSchedule: 0
            };
            coaches.push(coach);
          }
          coach = coaches.find(function (c) {
            return c.id === schedule.opponents[1].coach.id && c.competition === schedule.competition
          });
          if (!coach  && schedule.opponents[1].coach.id  !== null) {
            coach = {
              id: schedule.opponents[1].coach.id,
              name: schedule.opponents[1].coach.name,
              competition: schedule.competition,
              season: isConfigured.name,
              team: schedule.opponents[1].team.name,
              teamId: schedule.opponents[1].team.id,
              race: schedule.opponents[1].team.race,
              points: 0,
              games: 0,
              win: 0,
              loss: 0,
              draw: 0,
              tddiff: 0,
              strength: 0,
              strengthOfSchedule: 0
            };
            coaches.push(coach);
          }
        }
      } else if (schedule.winner) {
        var winner = coaches.find(function (c) {
          return c.id === schedule.winner.coach.id && c.competition === schedule.competition
        });
        if (!winner  && schedule.winner.coach.id !== null) {
          winner = {
            id: schedule.winner.coach.id,
            name: schedule.winner.coach.name,
            competition: schedule.competition,
            season: isConfigured.name,
            team: schedule.winner.team.name,
            teamId: schedule.winner.team.id,
            race: schedule.winner.team.race,
            points: 3,
            games: 1,
            win: 1,
            loss: 0,
            draw: 0,
            tddiff: schedule.winner.team.score,
            strength: 0,
            strengthOfSchedule: 0
          };
          coaches.push(winner);
        } else if(winner) {
          winner.games++;
          winner.win++;
          winner.points += 3;
          winner.tddiff += schedule.winner.team.score
        }

        if (schedule.winner.coach.id === schedule.opponents[0].coach.id) {
          let coach = coaches.find(function (c) {
            return c.id === schedule.opponents[1].coach.id && c.competition === schedule.competition
          });
          if (!coach && schedule.opponents[1].coach.id !== null) {
            coach = {
              id: schedule.opponents[1].coach.id,
              name: schedule.opponents[1].coach.name,
              competition: schedule.competition,
              season: isConfigured.name,
              team: schedule.opponents[1].team.name,
              teamId: schedule.opponents[1].team.id,
              race: schedule.opponents[1].team.race,
              points: 0,
              games: 1,
              win: 0,
              loss: 1,
              draw: 0,
              tddiff: schedule.opponents[1].team.score - schedule.opponents[0].team.score,
              strength: 0,
              strengthOfSchedule: 0
            };
            coaches.push(coach);
          } else if(coach) {
            coach.games++;
            coach.loss++;
            coach.tddiff += schedule.opponents[1].team.score - schedule.opponents[0].team.score;
          }
          if(winner) winner.tddiff -= schedule.opponents[1].team.score;
        } else {
          let coach = coaches.find(function (c) {
            return c.id === schedule.opponents[0].coach.id && c.competition === schedule.competition
          });
          if (!coach  && schedule.opponents[0].coach.id !== null) {
            coach = {
              id: schedule.opponents[0].coach.id,
              name: schedule.opponents[0].coach.name,
              competition: schedule.competition,
              season: isConfigured.name,
              team: schedule.opponents[0].team.name,
              teamId: schedule.opponents[0].team.id,
              race: schedule.opponents[0].team.race,
              points: 0,
              games: 1,
              win: 0,
              loss: 1,
              draw: 0,
              tddiff: schedule.opponents[0].team.score - schedule.opponents[1].team.score,
              strength: 0,
              strengthOfSchedule: 0
            };
            coaches.push(coach);
          } else if(coach) {
            coach.games++;
            coach.loss++;
            coach.tddiff += schedule.opponents[0].team.score - schedule.opponents[1].team.score
          }
          if(winner) winner.tddiff -= schedule.opponents[0].team.score;
        }

      } else {

        let coach = coaches.find(function (c) {
          return c.id === schedule.opponents[0].coach.id && c.competition === schedule.competition
        });
        if (!coach  && schedule.opponents[0].coach.id !== null) {
          coach = {
            id: schedule.opponents[0].coach.id,
            name: schedule.opponents[0].coach.name,
            competition: schedule.competition,
            season: isConfigured.name,
            team: schedule.opponents[0].team.name,
            teamId: schedule.opponents[0].team.id,
            race: schedule.opponents[0].team.race,
            points: 1,
            games: 1,
            win: 0,
            loss: 0,
            draw: 1,
            tddiff: 0,
            strength: 0,
            strengthOfSchedule: 0
          };
          coaches.push(coach);
        } else if(coach){
          coach.games++;
          coach.points++;
          coach.draw++;
        }

        coach = coaches.find(function (c) {
          return c.id === schedule.opponents[1].coach.id && c.competition === schedule.competition
        });
        if (!coach  && schedule.opponents[1].coach.id !== null) {
          coach = {
            id: schedule.opponents[1].coach.id,
            name: schedule.opponents[1].coach.name,
            competition: schedule.competition,
            season: isConfigured.name,
            team: schedule.opponents[1].team.name,
            teamId: schedule.opponents[1].team.id,
            race: schedule.opponents[1].team.race,
            points: 1,
            games: 1,
            win: 0,
            loss: 0,
            draw: 1,
            tddiff: 0,
            strength: 0,
            strengthOfSchedule: 0
          };
          coaches.push(coach);
        } else if(coach){
          coach.games++;
          coach.points++;
          coach.draw++;
        }

      }
    });
    const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: "base"})

    coaches.map(coach => coach.account = accounts.find(a => collator.compare(a.coach,  coach.name) === 0 ));

    //Because Big O
    coaches.map(coach => coach.competition = coach.competition.replace(/divsion/i, 'Division') );

    if (group){

      coaches = coaches.sort(function(a,b){
        return collator.compare(a.competition, b.competition);
      });      

      

      let data = this._groupBy(coaches, "competition");

      for(let div in data){

        //calculate strength
        data[div].map(c => c.strength = c.points/((c.win + c.draw + (c.loss > 1 ? 2 : c.loss))*3));

        //calculate strength of schedule
        for(let index in data[div]){
          let coach = data[div][index];
          let strengthOfSchedule = 0;

          let matches = schedules.filter(s => 
            s.competition = coach.competition 
            && s.opponents 
            && (s.opponents[0].coach.id === coach.id ||s.opponents[1].coach.id === coach.id) 
            && s.match_uuid
          );
    
          for (let index = 0; index < matches.length; index++) {
            let match = matches[index];
    
            const homeId = match.opponents[0].coach.id;

            const awayId = match.opponents[1].coach.id;

            let opponentCoach = homeId == coach.id
              ? await data[div].find(n => n.id === awayId)
              : await data[div].find(n => n.id === homeId);
    
            if (opponentCoach) strengthOfSchedule += opponentCoach.strength;
          }
          
          coach.strengthOfSchedule = strengthOfSchedule;
        }

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

            if (league.test("REBBL Eurogamer Open")){
              if (a.strengthOfSchedule > b.strengthOfSchedule) return -1;
              if (a.strengthOfSchedule < b.strengthOfSchedule) return 1;
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
    if(isNaN(coachId)){
      let regex = new RegExp(_id,"i");
      schedule = await dataService.getSchedule({"opponents.coach.name" : {$regex:regex}});
      if (schedule)
        return schedule.opponents.find(function(a){return a.coach.name ? a.coach.name.toLowerCase() === _id.toLowerCase() : false;}).coach;
      return null;  
    } else {
      schedule = await dataService.getSchedule({"opponents.coach.id" : coachId});
      if(schedule) {
        return schedule.opponents.find(function(a){return a.coach.id === coachId}).coach;
      }
      let team = await dataService.getTeam({"coach.id":coachId});
      return team.coach;
    }
  }

  async getMatchesForCoach(_id, coachId=Number(_id)){

    let ingoreTeams = [2018070,2018066,2018004,1365178,2018129,2018179,2032682,2307357,2018233,2018221,2116081,2018135,2018134,2018127,2018126,2018102,1701579];  

    let teams = await teamService.getTeams(coachId);

    teams = teams.filter(team => team.team.name.toLowerCase().indexOf("[admin]") < 0 );
    let ids = [...new Set(teams.map(team => team.team.id))];

    ids = ids.filter(e => ingoreTeams.indexOf(e) <0  );

    return await this.getContests({"opponents.coach.id" : coachId, "opponents.team.id":{$in: ids}});
  }

  async getContests(predicate){
    return await dataService.getSchedules(predicate);
  }

  async getMatchDetails(_id, matchId=String(_id)){

    let match = await dataService.getMatch({uuid: matchId});

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
    let regex = new RegExp(`^Season 13`, "i");

    let schedules = await dataService.getSchedules({"opponents.team.race" : {$in :stunties}, "competition": {$regex: regex} });

    let coaches = [];

    for(var i=0;i < schedules.length;i++){
      let schedule = schedules[i];
      if (!schedule.match_uuid)  continue;

      let match = await dataService.getMatch({uuid: schedule.match_uuid});

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
    const parseCoach = async (coach) => {
      if(coach.name){
        let regex = new RegExp(`^${coach.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
        let c = await accountService.searchAccount({"coach":  {"$regex": regex}});
        coach = Object.assign(coach, c);
      } else{
        coach.name="DO NOT PLAY THE AI";
        coach.reddit="AI";
        coach.id=0;
      }
    }

    let home = match.opponents[0];
    let away = match.opponents[1];

    parseCoach(home.coach);
    parseCoach(away.coach);

    let team = await teamService.getTeamById(home.team.id);
    home.team =  Object.assign(home.team, team);

    team = await teamService.getTeamById(away.team.id);
    away.team =  Object.assign(away.team, team);

    match.date = await datingService.getDate(match.contest_id);

    return match;
  }

  async getUpcomingMatch(_redditUser,_coachId, user=String(_redditUser), coachId=Number(_coachId)){


    let schedules = [];
    let clanSchedules =[];
    if(isNaN(coachId)){
      const account = await accountService.getAccount(user);
      let regex = new RegExp(`^${account.coach}$`, "i");
      schedules = await dataService.getSchedules({"opponents.coach.name": {"$regex": regex}, "status":"scheduled"} );
      clanSchedules = await dataService.getSchedules( {"matches":{$elemMatch:{"opponents.coach.name":  {"$regex": regex}, status:"scheduled" , match_uuid:null}}},{projection:{"matches.$":1}} );
      for(let i = schedules.length-1; i>=0;i--){
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
    } else{
      schedules = await dataService.getSchedules({"opponents.coach.id": coachId, "status":"scheduled"} );
      clanSchedules = await dataService.getSchedules( {"matches":{$elemMatch:{"opponents.coach.id":  coachId, status:"scheduled" , match_uuid:null}}},{projection:{"matches.$":1}} );
      for(let i = schedules.length-1; i>=0;i--){
        if(schedules[i].opponents[0].coach.id === coachId){
          if(/^\[admin].+/i.test(schedules[i].opponents[0].team.name)){
            schedules.splice(i,1);
            continue;
          }
        }
  
        if (schedules[i].opponents[1].coach.id === coachId){
          if(/^\[admin].+/i.test(schedules[i].opponents[1].team.name)){
            schedules.splice(i,1);
          }
        }
      }
    }


                                                       
    if(clanSchedules.length > 0){
      schedules.push(clanSchedules[0].matches[0]);
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
    let match = await dataService.getSchedule({contest_id: contestId});

    return [await this._unplayedMatch(match)];    
  }

  updateContest(criteria, data){

    dataService.updateSchedule(criteria, data);

  }

  async getRound(league,competition){
    let data = await cyanideService.competitions({league:league, platform:"pc"});

    let comp = data.competitions.find(c => c.name === competition);

    
    return comp ? comp.round : 7;

  }
  
}

module.exports = new LeagueService();