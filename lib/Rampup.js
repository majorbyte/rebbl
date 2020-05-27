"use strict";
const apiService = require("./apiService.js")
  , dataService = require("./DataService.js").rebbl;
  


class Rampup {
  constructor(){
    this.ownerId = 111960;
    this.gmanLeagueId = 54659;
    this.relLeagueId = 54657;
  }

  async getCoachScore() {
    let coaches = [];
    let schedules = await dataService.getSchedules({"league": {"$regex": new RegExp(/rampup$/,"i")}, "status":"played", "match_uuid":{$gt:"1000790140"}});

    let coachHome = schedules.map(schedule => schedule.opponents[0].coach.id);
    let coachAway = schedules.map(schedule => schedule.opponents[1].coach.id);
    let ids = [...new Set([...coachAway, ...coachHome])];
    
    //init coaches, so we know which rampup they are part of
    schedules.sort((a,b) => a.contest_id < b.contest_id).forEach(function (schedule) {
      let coach = coaches.find(c => c.id === schedule.opponents[0].coach.id);
      if (!coach && ids.indexOf(schedule.opponents[0].coach.id) > -1) {
          coach = {
            competition: schedule.competition,
            id: schedule.opponents[0].coach.id,
            name: schedule.opponents[0].coach.name,
            team: schedule.opponents[0].team.name,
            teamId: schedule.opponents[0].team.id,
            race: schedule.opponents[0].team.race,
            points: 0,
            games: 0,
            win: 0,
            loss: 0,
            draw: 0,
            tddiff: 0
          };
          coaches.push(coach);
      }
      coach = coaches.find(c => c.id === schedule.opponents[1].coach.id);
      if (!coach && ids.indexOf(schedule.opponents[1].coach.id) > -1 ) {
          coach = {
            competition: schedule.competition,
            id: schedule.opponents[1].coach.id,
            name: schedule.opponents[1].coach.name,
            team: schedule.opponents[1].team.name,
            teamId: schedule.opponents[1].team.id,
            race: schedule.opponents[1].team.race,
            points: 0,
            games: 0,
            win: 0,
            loss: 0,
            draw: 0,
            tddiff: 0
          };
          coaches.push(coach);
      }
    });

    //get all coach id's


    if (ids.indexOf(111960) > -1) ids.splice(ids.indexOf(111960),1 );
    if (ids.indexOf(null) > -1) ids.splice(ids.indexOf(null),1 );

    schedules = await dataService.getSchedules({"competition": {"$regex": new RegExp(/^S14|Season 14|rampup$/,"i")}, "status":"played", "opponents.coach.id": {$in:ids}, "opponents.coach.name":{$ne:"Mystaes"}, "match_uuid":{$gt:"1000790140"} } );


    schedules = schedules.sort(function (a, b) {

      return a.contest_id > b.contest_id ? -1 : 1;
    });

    schedules.forEach(function (schedule) {
      
      if (schedule.winner ) {
        var winner = coaches.find(c => c.id === schedule.winner.coach.id);
        if (!winner && ids.indexOf(schedule.winner.coach.id) > -1 ) {
          winner = {
            competition: schedule.competition,
            id: schedule.winner.coach.id,
            name: schedule.winner.coach.name,
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
          winner.tddiff += schedule.winner.team.score;
        }

        if (schedule.winner.coach.id === schedule.opponents[0].coach.id) {
          let coach = coaches.find(c => c.id === schedule.opponents[1].coach.id);
          if (!coach && ids.indexOf(schedule.opponents[1].coach.id) > -1 ) {
            coach = {
              competition: schedule.competition,
              id: schedule.opponents[1].coach.id,
              name: schedule.opponents[1].coach.name,
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
          } else if(coach) {
            coach.games++;
            coach.loss++;
            coach.tddiff += schedule.opponents[1].team.score - schedule.opponents[0].team.score;
          }
          if(winner) winner.tddiff -= schedule.opponents[1].team.score;
        } else {
          let coach = coaches.find(c => c.id === schedule.opponents[0].coach.id);
          if (!coach && ids.indexOf(schedule.opponents[0].coach.id) > -1) {
            coach = {
              competition: schedule.competition,
              id: schedule.opponents[0].coach.id,
              name: schedule.opponents[0].coach.name,
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
            coach.tddiff += schedule.opponents[0].team.score - schedule.opponents[1].team.score;
          }
          if(winner) winner.tddiff -= schedule.opponents[0].team.score;
        }

      } else {

        let coach = coaches.find(c => c.id === schedule.opponents[0].coach.id);
        if (!coach && ids.indexOf(schedule.opponents[0].coach.id) > -1) {
            coach = {
              competition: schedule.competition,
              id: schedule.opponents[0].coach.id,
              name: schedule.opponents[0].coach.name,
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
        } else if(coach) {
            coach.games++;
            coach.points++;
            coach.draw++;
        }

        coach = coaches.find(c => c.id === schedule.opponents[1].coach.id);
        if (!coach && ids.indexOf(schedule.opponents[1].coach.id) > -1 ) {
            coach = {
              competition: schedule.competition,
              id: schedule.opponents[1].coach.id,
              name: schedule.opponents[1].coach.name,
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
        } else if(coach) {
            coach.games++;
            coach.points++;
            coach.draw++;
        }
      }
    });
  
    let data = this._groupBy(coaches, "competition");

    for(let div in data){
      data[div] = data[div].sort(
        function(a,b){
          //points
          if(a.points > b.points) {return -1;} 
          if (b.points > a.points) {return 1;} 
          
          //tie-breaker #1 : TD-diff
          if (a.tddiff > b.tddiff) {return -1;} 
          if (b.tddiff > a.tddiff) {return 1;} 
          
          //tie-breaker #2 : Loss diff
          if(a.loss > b.loss){return 1;} 
          if(b.loss > a.loss){return -1;} 
          
          //tie-breaker #3 : Head to Head
          let match = schedules.find(function(s) {
              if (!s.opponents) return false;
              return s.opponents[0].coach.id === a.id && s.opponents[1].coach.id === b.id || s.opponents[1].coach.id === a.id && s.opponents[0].coach.id === b.id; 
          });

          if (match && match.winner){
              if (match.winner.coach.id === a.id) return -1;
              if (match.winner.coach.id === b.id) return 1;
          }

          return 0; 
        }
      );
    }
    return data;
  }

  async getAvailableRampupCoaches(){
    const signedUp = await dataService.getSignups({season:"season 14", "saveType":"rampup"});
    let coaches = signedUp.map(x => x.coach);
    
    const schedules = await dataService.getSchedules({season:"season 14", "opponents.coach.name":{$in:coaches}, league:"REBBL -"});
    schedules.map(x => signedUp.splice(signedUp.findIndex(c => c.coach === x.opponents[0].coach.name || c.coach === x.opponents[1].coach.name ),1));

    return signedUp;
  }

  async createMatchup(isGMan,teams,competitionName)
  {

    const competitionId = await this.createCompetition(isGMan, competitionName);

    await apiService.inviteTeam(competitionId, this.ownerId, teams[0].id,teams[0].coachId);
    await apiService.inviteTeam(competitionId, this.ownerId, teams[1].id,teams[1].coachId);
  }

  async createCompetition(isGMan, competitionName){
    const leagueId = isGMan ? this.gmanLeagueId: this.relLeagueId;

    let result = await apiService.createCompetition(leagueId,competitionName, this.ownerId, 2, 1,"RoundRobin","FourMinutes","InviteOnly",true,true,false,true,false,false,false,true);

    return Number(result.CompetitionData.RowCompetition.Id.Value.replace(/\D/g,""));
  }

  async createSchedule(isGMan, competitionName, competitionId,teams){


    const schedule = {
      "league" : isGMan ? "GMAN Rampup" : "REL Rampup",
      "league_id" : isGMan ? this.gmanLeagueId : this.relLeagueId,
      "competition" : competitionName,
      "competition_id" : competitionId,
      "contest_id" : 0,
      "format" : "round_robin",
      "round" : 1,
      "type" : "single_match",
      "status" : "scheduled",
      "stadium" : null,
      "match_uuid" : null,
      "match_id" : null,
      "opponents" : [ 
          {
            "coach" : {
                "id" : teams[0].coach.id,
                "name" : teams[0].coach.name
            },
            "team" : {
                "id" : teams[0].team.id,
                "name" : teams[0].team.name,
                "logo" : teams[0].team.logo,
                "value" : teams[0].team.value,
                "motto" : teams[0].team.leitmotiv,
                "score" : null,
                "death" : null,
                "race" :  teams[0].team.race
            }
          }, 
          {
            "coach" : {
                "id" : teams[1].coach.id,
                "name" : teams[1].coach.name
            },
            "team" : {
                "id" : teams[1].team.id,
                "name" : teams[1].team.name,
                "logo" : teams[1].team.logo,
                "value" : teams[1].team.value,
                "motto" : teams[1].team.leitmotiv,
                "score" : null,
                "death" : null,
                "race" :  teams[1].team.race
            }
          }
      ],
      "winner" : null,
      "season" : "season 14"
    };

    dataService.insertSchedule(schedule);

  }


  _groupBy(xs, key) {
    return xs.reduce(function(rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
  }
}

module.exports = new Rampup();