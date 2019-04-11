"use strict";

class Rampup {
  constructor(){
      this.leagueService = require("./LeagueService.js");
  }

  async getCoachScore() {
    let coaches = [];
    let schedules = await this.leagueService.searchLeagues({"league": {"$regex": new RegExp(/rampup$/,"i")}, "status":"played", "match_uuid":{$gt:"10005d4fa1"}});

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

    schedules = await this.leagueService.searchLeagues({"competition": {"$regex": new RegExp(/^Season 11|rampup$/,"i")}, "status":"played", "opponents.coach.id": {$in:ids}, "opponents.coach.name":{$ne:"Mystaes"}, "match_uuid":{$gt:"100054a72d"} } );


    schedules = schedules.sort(function (a, b) {

      return a.contest_id > b.contest_id ? -1 : 1;
    });

    const l = schedules.length;


    schedules.forEach(function (schedule) {
      
      if (schedule.winner ) {
        var winner = coaches.find(c => c.id === schedule.winner.coach.id);
        if (!winner  && ids.indexOf(schedule.winner.coach.id) > -1 ) {
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
          winner.tddiff += schedule.winner.team.score
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
            coach.tddiff += schedule.opponents[0].team.score - schedule.opponents[1].team.score
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
              return ((s.opponents[0].coach.id === a.id && s.opponents[1].coach.id === b.id) || (s.opponents[1].coach.id === a.id && s.opponents[0].coach.id === b.id)) 
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

  _groupBy(xs, key) {
    return xs.reduce(function(rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
  };
}

module.exports = new Rampup();