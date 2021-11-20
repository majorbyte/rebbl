"use strict";
const apiService = require("./apiService.js")
  , dataService = require("./DataService.js").rebbl;
  


class Rampup {
  constructor(){
    this.ownerId = 111960;
    this.gmanLeagueId = 54659;
    this.relLeagueId = 54657;

    this.races = [
       {id:13,name:"Amazon"}
      ,{id:24,name:"Bretonnian"}
      ,{id:8,name:"Chaos"}
      ,{id:21,name:"ChaosDwarf"}
      ,{id:9,name:"DarkElf"}
      ,{id:2,name:"Dwarf"}
      ,{id:14,name:"ElvenUnion"}
      ,{id:6,name:"Goblin"}
      ,{id:11,name:"Halfling"}
      ,{id:15,name:"HighElf"}
      ,{id:1,name:"Human"}
      ,{id:16,name:"Khemri"}
      ,{id:25,name:"Kislev"}
      ,{id:5,name:"Lizardman"}
      ,{id:17,name:"Necromantic"}
      ,{id:12,name:"Norse"}
      ,{id:18,name:"Nurgle"}
      ,{id:4,name:"Orc"}
      ,{id:19,name:"Ogre"}
      ,{id:3,name:"Skaven"}
      ,{id:10,name:"Undead"}
      ,{id:22,name:"UnderworldDenizens"}
      ,{id:20,name:"Vampire"}
      ,{id:7,name:"WoodElf"}
    ];
  }

  async getCoachScore() {
    let coaches = [];
    let schedules = await dataService.getSchedules({"league": {"$regex": new RegExp(/rampup$/,"i")}, "status":"played", "match_uuid":{$gt:"1000a4b4e8"}});

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

    schedules = await dataService.getSchedules({"competition": {"$regex": new RegExp(/^S17|Season 18|rampup$/,"i")}, "status":"played", "opponents.coach.id": {$in:ids}, "opponents.coach.name":{$ne:"Mystaes"}, "match_uuid":{$gt:"10009cd431"} } );


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
    const signedUp = await dataService.getSignups({season:"season 18", "saveType":"rampup", exclude:{$ne:true}});
    let coaches = signedUp.map(x => x.coach);
    
    const schedules = await dataService.getSchedules({season:"season 18", "opponents.coach.name":{$in:coaches}, league:{$regex:/^REBBL -/i}});
    schedules.map(x => {
      let index = signedUp.findIndex(c => c.coach === x.opponents[0].coach.name || c.coach === x.opponents[1].coach.name );
      if (index > -1) signedUp.splice(index,1);
    });

    return signedUp;
  }

  async createMatchup(isGMan,teams,competitionName)
  {

    const competitionId = await this.createCompetition(isGMan, competitionName);
    for(let x =0; x<2; x++){
      teams[x].coachId = await this.getCoachId(teams[x].coach);
      teams[x].team = await this.getTeamId(teams[x].coachId, teams[x].team);
      await apiService.inviteTeam(competitionId, this.ownerId, Number(teams[x].team.id), Number(teams[x].coachId));
    }

    await this.createSchedule(isGMan,competitionName, competitionId,teams);
  }

  async createCompetition(isGMan, competitionName){
    const leagueId = isGMan ? this.gmanLeagueId: this.relLeagueId;

    let result = await apiService.createCompetition(leagueId,competitionName, this.ownerId, 2, 0,"RoundRobin","FourMinutes","InviteOnly",true,true,false,true,false,false,false,true);

    return Number(result.CompetitionData.RowCompetition.Id.Value.replace(/\D/g,""));
  }

  async createSchedule(isGMan, competitionName, competitionId,teams){
    let index = competitionName.toLowerCase().indexOf("w");
    const round = parseInt(competitionName.substr(index+1,1));
    index = competitionName.toLowerCase().indexOf("game");
    const game = parseInt(competitionName.substr(index+5,3));

    const schedule = {
      "league" : isGMan ? "GMAN Rampup" : "REL Rampup",
      "league_id" : isGMan ? this.gmanLeagueId : this.relLeagueId,
      "competition" : isGMan ? "GMAN Rampup" : "REL Rampup",
      "competition_id" : competitionId,
      "contest_id" : (round*10 + game) * (isGMan ? 1 : -1),
      "format" : "round_robin",
      "round" : round,
      "type" : "single_match",
      "status" : "scheduled",
      "stadium" : null,
      "match_uuid" : null,
      "match_id" : null,
      "opponents" : [ 
          {
            "coach" : {
                "id" : Number(teams[0].coachId),
                "name" : teams[0].coach
            },
            "team" : {
                "id" : Number(teams[0].team.id),
                "name" : teams[0].team.name,
                "logo" : teams[0].team.logo,
                "value" : Number(teams[0].team.value),
                "motto" : teams[0].team.leitmotiv,
                "score" : null,
                "death" : null,
                "race" :  this.races.find(x => x.id === Number(teams[0].team.race)).name
            }
          }, 
          {
            "coach" : {
                "id" : Number(teams[1].coachId),
                "name" : teams[1].coach
            },
            "team" : {
                "id" : Number(teams[1].team.id),
                "name" : teams[1].team.name,
                "logo" : teams[1].team.logo,
                "value" : Number(teams[1].team.value),
                "motto" : teams[1].team.leitmotiv,
                "score" : null,
                "death" : null,
                "race" : this.races.find(x => x.id === Number(teams[1].team.race)).name
            }
          }
      ],
      "winner" : null,
      "season" : "season 18",
      "old_comp": competitionName
    };
    dataService.insertSchedule(schedule);

  }

  async getCoachId(coachName){
    
    let coach = await apiService.findCoach(coachName);
    if (coach.ResponseSearchCoach.Coaches !== ""){
      if (!Array.isArray(coach.ResponseSearchCoach.Coaches.DataUser))
        coach.ResponseSearchCoach.Coaches.DataUser =[coach.ResponseSearchCoach.Coaches.DataUser];

      const coachRecord = coach.ResponseSearchCoach.Coaches.DataUser.find(x => x.User.localeCompare(coachName,undefined,{sensitivity:"base"}) === 0);
      if (!coachRecord) throw `Coach ${coachName} does not exist`;
      return coachRecord.IdUser;
    } 
    if (coach.ResponseSearchCoach.Coaches === "") throw `Coach ${coachName} does not exist`;

    return coach.ResponseSearchCoach.Coaches.DataUser.IdUser;
  }

  async getTeamId(coachId, teamName){
    const coach = await apiService.getCoachInfo(coachId);

    if (!Array.isArray(coach.ResponseGetCoachOverview.Teams.Team)){
      coach.ResponseGetCoachOverview.Teams.Team = [coach.ResponseGetCoachOverview.Teams.Team];
    }

    const r = new RegExp(teamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),"i");
    const team = coach.ResponseGetCoachOverview.Teams.Team.find(x => r.test(x.Row.Name));

    if (!team) throw `Could not find team ${teamName}`;

    return {
      "id" : team.Row.ID.Value.replace(/\D/g,""),
      "name" : team.Row.Name,
      "logo" : team.Row.Logo,
      "value" : team.Row.Value,
      "motto" : team.Row.Leitmotiv,
      "score" : null,
      "death" : null,
      "race" :  team.Row.IdRaces
    };
  }
  async excluceCoach(coach){
    const r = new RegExp(coach,"i");
    dataService.updateSignup({saveType:"rampup",season:"season 18", coach:{$regex: r}},{$set:{exclude:true}});
  }

  _groupBy(xs, key) {
    return xs.reduce(function(rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
  }
}

module.exports = new Rampup();