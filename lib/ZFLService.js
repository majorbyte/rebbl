"use strict";
const axios = require("axios"),
cyanideService = require("./CyanideService.js"),
dataService = require("./DataServiceBB3.js").rebbl3,
fs = require('fs/promises');

class ZFLService{
  constructor(){
    this.apiUrl = process.env["BB3Url"];
    this.logos = [];
    this.skills = [];
    this.year = 2494;
    // e3500321-83d6-11ef-be7b-bc24112ec32e new zfl league
  }

  async updateCompetitions (leagueId){
    try{
      let response = await axios.get(`${this.apiUrl}/api/league/${leagueId}/competitions`);

      const mapCompetition = competition => { 
        return {
          id: competition.id, 
          name: competition.name,
          day: Number(competition.day),
          status : Number(competition.status),
          format: Number(competition.format),
          logo: competition.logo,
          boardId: competition.boardId,
          leagueId: leagueId,
        };
      };

      const competitions = response.data.responseGetCompetitions.competitions.competition.map(mapCompetition);
      
      for(let competition of competitions){
        if (competition.format == 4) continue; //skip ladder for now
        
        let updatedSchedules= [];

        if (competition.status >= 3) {
          updatedSchedules = await this.updateSchedules(competition);

          await this.updateMatches(updatedSchedules);
        }
      }
    }
    catch(e){
      console.error("something went wrong",e);
    }
  }

  async updateSchedules (competition){
    let response = await axios.get(`${this.apiUrl}/api/competition/schedule/${competition.id}/${competition.day}`);

    const nameRegex = new RegExp(`${competition.name.split(' ')[0]}`, "i");
    const zflCompetition = await dataService.getZFLCompetition({name: nameRegex, year: this.year});

    if (!zflCompetition) return;

    const mapSchedule = schedule => {
      return {
        id: schedule.id,
        competitionId: competition.id,
        competitionName: competition.name,
        matchId: schedule.matches.match.id,
        gameId: schedule.matches.match.gameId ?? schedule.matches.match.id,
        status: Number(schedule.matches.match.status),
        home:{
          coach:{
            id:schedule.matches.match.homeGamer.id,
            name: schedule.matches.match.homeGamer.name
          },
          team:{
            id: schedule.matches.match.homeTeam.id,
            name: schedule.matches.match.homeTeam.name,
            logo: schedule.matches.match.homeTeam.logo.itemId,
            value: Number(schedule.matches.match.homeTeam.value),
            motto:schedule.matches.match.homeTeam.motto,
            race: Number(schedule.matches.match.homeTeam.race),
            valueWithJourneymen: Number(schedule.matches.match.homeTeam.valueWithJourneymen),
            hasPlayerThatMustLevelUp: Number(schedule.matches.match.homeTeam.hasPlayerThatMustLevelUp),
            mustRollExpensiveMistake: Number(schedule.matches.match.homeTeam.mustRollExpensiveMistake),
            hasPlayerThatCanLevelUp: Number(schedule.matches.match.homeTeam.hasPlayerThatCanLevelUp),
            hasRecrutableJourneymen: Number(schedule.matches.match.homeTeam.hasRecrutableJourneymen),

          },
          score:Number(schedule.matches.match.homeScore)
        },
        away:{
          coach:{
            id:schedule.matches.match.awayGamer.id,
            name: schedule.matches.match.awayGamer.name
          },
          team:{
            id: schedule.matches.match.awayTeam.id,
            name: schedule.matches.match.awayTeam.name,
            logo: schedule.matches.match.awayTeam.logo.itemId,
            value: Number(schedule.matches.match.awayTeam.value),
            motto:schedule.matches.match.awayTeam.motto,
            race: Number(schedule.matches.match.awayTeam.race),
            valueWithJourneymen: Number(schedule.matches.match.awayTeam.valueWithJourneymen),
            hasPlayerThatMustLevelUp: Number(schedule.matches.match.awayTeam.hasPlayerThatMustLevelUp),
            mustRollExpensiveMistake: Number(schedule.matches.match.awayTeam.mustRollExpensiveMistake),
            hasPlayerThatCanLevelUp: Number(schedule.matches.match.awayTeam.hasPlayerThatCanLevelUp),
            hasRecrutableJourneymen: Number(schedule.matches.match.awayTeam.hasRecrutableJourneymen),

          },
          score:Number(schedule.matches.match.awayScore)
        }
      }
    }

    if (typeof response.data.responseGetCompetitionSchedule.schedule === "string") return [];
    if (!Array.isArray(response.data.responseGetCompetitionSchedule.schedule.contest)) response.data.responseGetCompetitionSchedule.schedule.contest = [response.data.responseGetCompetitionSchedule.schedule.contest];
    let schedules = response.data.responseGetCompetitionSchedule.schedule.contest.map(mapSchedule);

    schedules = schedules.filter(x => x.status === 3) // validated

    const updatedSchedules = [];
    for(const schedule of schedules){

      const fixture = zflCompetition.fixtures.find(x => x.competition.name === competition.name);
      if (fixture.updated) continue;

      await dataService.updateZFLCompetition({_id: zflCompetition._id, "fixtures.competition.name":schedule.competitionName},
      {
        $set:{
          "fixtures.$.home.score":schedule.home.score,
          "fixtures.$.away.score":schedule.away.score,
          "fixtures.$.matchId":schedule.matchId,
          "fixtures.$.gameId":schedule.gameId,
          "fixtures.$.updated":true,
          "fixtures.$.released":false,
        }
      });

      updatedSchedules.push(schedule);

    }
    return updatedSchedules;
  }

  async updateTeams(){
    const logos = await dataService.getLogos();

    const competitions = await dataService.getZFLCompetitions({year:this.year});
    for(const competition of competitions)
    for(const standing of competition.standings){
      await this.#updateTeam(standing.id, logos);
    }
  }

  async updateTeam(teamId){ 
    const logos = await dataService.getLogos();

    this.#updateTeam(teamId,logos);
  }

  async #updateTeam(teamId, logos){
    let response = await axios.get(`${this.apiUrl}/api/Team/${teamId}`);
    const team = response.data.responseGetTeam.team;

    const logo = logos.find(x => x.id.toLocaleLowerCase() == team.logo.itemId?.toLocaleLowerCase());
    team.logo.icon = logo ? `${logo.logo}.png` : `Logo_Human_01.png`;

    response = await axios.get(`${this.apiUrl}/api/Team/${team.id}/roster`);
  
    team.treasury = response.data.responseGetTeamRoster.roster.treasury;
    team.roster = response.data.responseGetTeamRoster.roster.slots.teamRosterSlot;
    team.improvements = response.data.responseGetTeamRoster.roster.improvements.teamRosterImprovementsEntry;
    team.year = this.year;

    await dataService.updateZFLTeam({id:team.id},team,{upsert:true});
  }

  async updateMatches (schedules){
    if (!schedules || schedules.length === 0) return;

    if (this.skills.length === 0) this.skills = await dataService.getSkills();

    let teamIds = schedules.map(x => x.home.team.id).concat(schedules.map(x => x.away.team.id));
    teamIds = [...new Set(teamIds)];

    const gameIds = schedules.map(x => x.gameId);
    for(const gameId of gameIds){
      if(!gameId) continue;

      const exists = await dataService.getZFLMatch({gameId:gameId});
      if (exists) continue;


      let response  = await axios.get(`${this.apiUrl}/api/game/${gameId}`);
      const match = response.data.responseGetGameResult.gameResult;
  
      response = await cyanideService.match({bb:3, match_id:match.gameId});

      match.homeTeam.logo.icon = this.#getCyanideLogo(response.match.teams[0].teamlogo) + '.png';
      match.awayTeam.logo.icon = this.#getCyanideLogo(response.match.teams[1].teamlogo) + '.png';

      match.homeTeam.roster = this.#parseRoster(response.match.teams[0].roster);
      match.awayTeam.roster = this.#parseRoster(response.match.teams[1].roster);

      match.released = false;

      await dataService.updateZFLMatch({gameId:match.gameId}, match,{upsert:true});

      const schedule = schedules.find(x => x.gameId == gameId);
      await this.#downloadReplay(schedule);
    }
  }

  async calculateAllStandings(){
    const competitions = await dataService.getZFLCompetitions({year:2494});
    for (const competition of competitions) await this.calculateStandings(competition);
  }

  async calculateStandings(competition){
    const fixtures = competition.fixtures;

    const initMatches = fixtures.filter(x => x.round == 1);

    let matches = fixtures.filter(x => x.released);

    let coaches = [];
    /*{
      "name" : "Barak Ginn Boozers",
      "id" : 0,
      "logo" : "BOOZERS.png",
      "games" : 0,
      "points" : 0,
      "wins" : 0,
      "draws" : 0,
      "losses" : 0,
      "tdDiff" : 0,
      "tdFor" : 0,
      "tdAgainst" : 0
    }*/
    for(let match of initMatches){
      [match.home, match.away].map(opponent => coaches.push({
          name: opponent.team.name,
          id: opponent.team.id,
          logo: opponent.team.logo,
          race: opponent.team.race,
          coach: opponent.coach,
          points: 0,
          games: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          tdDiff: 0,
          tdFor:0,
          tdAgainst:0
      }));
    }

    matches = matches.sort((a,b) => a.round < b.round);
    
    matches.forEach(match => {
      if (match.home.score == match.away.score){
        //process both as a draw

        let coach = coaches.find(function (c) {
          return c.id === match.home.coach.id;
        });

        if (!coach) {
          coach = this.#newScore(match.home,1,0); 
          coaches.push(coach);
        } else {
          coach.games++;
          coach.points++;
          coach.draw++;
        }

        coach = coaches.find(function (c) {
          return c.id === match.away.coach.id;
        });
        if (!coach) {
          coach = this.#newScore(match.away,1,0); 
          coaches.push(coach);
        } else {
          coach.games++;
          coach.points++;
          coach.draw++;
        }
      } else {
        let winningTeam = match.home.score > match.away.score ? match.home : match.away;
        let losingTeam  = match.home.score < match.away.score ? match.home : match.away;

        let winner = coaches.find(function (c) {
          return c.id === winningTeam.coach.id; 
        });
        
        let loser = coaches.find(function (c) {
          return c.id === losingTeam.coach.id;
        });
        
        //process winner
        if(!winner){
            winner = this.#newScore(winningTeam,3,winningTeam.score, losingTeam.score); 
            coaches.push(winner);
        } else {
            winner.games++;
            winner.win++;
            winner.points += 3;
            winner.tdDiff += winningTeam.score - losingTeam.score;
            winner.tdFor += winningTeam.score; 
            winner.tdAgainst += losingTeam.score;
          }

        //process loser
        if(!loser){
          loser = this.#newScore(losingTeam,0,losingTeam.score,winningTeam.score); 
          coaches.push(loser);
        } else {
          loser.games++;
          loser.loss++;
          loser.tdDiff += losingTeam.score - winningTeam.score;
          loser.tdFor += losingTeam.score; 
          loser.tdAgainst += winningTeam.score;
        }
      } 
    });

    coaches = coaches.sort(
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
        let match = matches.find(s => s.home.coach.id === a.id && s.away.coach.id === b.id || s.away.coach.id === a.id && s.home.coach.id === b.id);

        if (match && match.home.score !== match.away.score){
          const winner = match.home.score > match.away.score ? match.home : match.away;
          if (winner.coach.id === a.id) return -1;
          if (winner.coach.id === b.id) return 1;
        }

        return 0; 
      });

    coaches.map((coach,index) => coach.position = index+1);
    
    await dataService.updateZFLCompetition({name:competition.name, year:competition.year},{$set:{standings:coaches}});
  }

  async #downloadReplay(schedule){
    const match = await dataService.getZFLMatch({gameId:schedule.gameId});
    if (!match) return;
    
    const response = await axios.get(`${this.apiUrl}/api/cabaltv/${match.gameId}/download`); 
    if (response.data.replayData === "") return;

    await fs.writeFile(`./replays/bb3/${match.gameId}.bbr`, response.data.responseDownloadReplay.replayData);
    await fs.writeFile(`./zflstats/replays/${match.gameId}.bbr`, response.data.responseDownloadReplay.replayData);
    await dataService.updateZFLMatch({matchId:schedule.matchId},{$set:{replayFile:`${match.gameId}.bbr`}});
  }

  #getCyanideLogo = logo => logo.replace("Neutral", "Neutre").replace("ChaosChosen", "Chaos");

  #newScore(opponent, points, tdFor, tdAgainst){
    return {
      coach: opponent.coach,
      name: opponent.team.name,
      id: opponent.team.id,
      logo: opponent.team.logo,
      race: opponent.team.race,
      points: points,
      games: 1,
      wins: points === 3 ? 1 :0,
      losses: points === 0 ? 1 :0,
      draws: points === 1 ? 1 :0,
      tdDiff: tdFor - tdAgainst,
      tdFor: tdFor,
      tdAgainst: tdAgainst
    };
  } 

  #parseRoster = (roster) => roster.map(this.#mapPlayer.bind(this));

  #mapPlayer(player){
    return {
      id: player.id,
      name: player.name,
      number: player.number,
      type: player.type,
      mvp: player.mvp,
      level: player.level,
      xp: player.xp,
      xpGained: player.xp_gain,
      matchPlayed: player.matchplayed,
      attributes: player.attributes,
      attributesEx: player.attributes_ex,
      stats: player.stats,
      skills: this.#mapSkills(player.skills).filter(x => x !== null),
      casualties: this.#mapCasualties(player.casualties)
    }
  }

  #mapSkills = skills => skills.InnateSkills.map(this.#mapSkill.bind(this)).concat(skills.AcquiredSkills.map(this.#mapSkill.bind(this)));

  #mapSkill(skill){
    skill = skill.replace("+","").replace("(","").replace(")","").replace("-"," ").trim().replace(/(^\w|\s\w)/g, m => m.toUpperCase()).replace(/ /g,"");

    const result = this.skills.find(x => x.name == skill);
    if (!result) {
      console.log(`skill ${skill} not found.`)    
      return null;
    }
    return result.id
  }

  #mapCasualties = cas => cas.NewCasualty.map(this.#mapCasualty);

  #mapCasualty = cas => {
    switch (cas){
      case "badly_hurt": return 1;
      case "seriously_hurt": return 2;
      case "serious_injury": return 3;
      case "lasting_injury": return 4;
      case "smashed_knee": return 5;
      case "head_injury": return 6;
      case "broken_arm": return 7;
      case "neck_injury": return 8;
      case "dislocated_shoulder": return 9;
      case "dead": return 10;
    }
  }
}

module.exports = new ZFLService();
