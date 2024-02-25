"use strict";
const axios = require("axios"),
dataService = require("./DataServiceBB3.js").rebbl3;

class BB3Service{
  constructor(){
    this.apiUrl = process.env["BB3Url"];
    this.logos = [];
  }

  async searchTeams(coachId,teamName){
    let x = 0;
    let response = await axios.get(`${this.apiUrl}/api/team/gamer/${coachId}/search/${teamName}/10/${x}`);

    const total = Number(response.data.responseGetTeams.total);

    const mapEntry = entry => {
      return {
        id : entry.id,
        name : entry.name,
        value :entry.value,
        race: this.#getRace(Number(entry.race)),
        experienced : Number(entry.experienced) === 1
      }
    }

    if (!Array.isArray(response.data.responseGetTeams.teams.team)) response.data.responseGetTeams.teams.team = [response.data.responseGetTeams.teams.team];
    let teams = response.data.responseGetTeams.teams.team.map(mapEntry);
    while(x+10 < total){
      x += 10;
      response = await axios.get(`${this.apiUrl}/api/team/gamer/${coachId}/search/${teamName}/10/${x}`);
      if (!Array.isArray(response.data.responseGetTeams.teams.team)) response.data.responseGetTeams.teams.team = [response.data.responseGetTeams.teams.team];
      teams = teams.concat(response.data.responseGetTeams.teams.team.map(mapEntry));
    }

    return teams;
  }

  async getRanking(competitionId){
    let x = 0;
    let response = await axios.get(`${this.apiUrl}/api/competition/ranking/${competitionId}/50/${x}`);
    
    const mapEntry = entry => { 
      return {
        bonusAttack : entry.bonusAttack,
        bonusDefense : entry.bonusDefense,
        bonusViolence : entry.bonusViolence,
        loss: entry.loss,
        draw: entry.draw,
        performance : entry.performance,
        points : entry.points,
        position : entry.position,
        touchdownAgainst : entry.touchdownAgainst,
        touchdownFor : entry.touchdownFor,
        win : entry.win,
        team: {
          id: entry.participant.team.id,
          logo: entry.participant.team.logo.itemId,
          motto: entry.participant.team.logo.motto,
          name: entry.participant.team.name,
          race: entry.participant.team.race,
          value: entry.participant.team.value
        },
        coach:{
          id: entry.participant.gamer.id,
          name: entry.participant.gamer.name,
        }
      };
    };

    const ranking = {
      competitionId:response.data.responseGetCompetitionRanking.competition.id,
      total: response.data.responseGetCompetitionRanking.total,
      entries:[]
    }
    if (!Array.isArray(response.data.responseGetCompetitionRanking.entries.competitionRankingEntry))
      response.data.responseGetCompetitionRanking.entries.competitionRankingEntry = [response.data.responseGetCompetitionRanking.entries.competitionRankingEntry];
    ranking.entries.push(...response.data.responseGetCompetitionRanking.entries.competitionRankingEntry.map(mapEntry));
    x += 50;
    while (x < ranking.total){
      response = await axios.get(`${this.apiUrl}/api/competition/ranking/${competitionId}/50/${x}`);
      if (!Array.isArray(response.data.responseGetCompetitionRanking.entries.competitionRankingEntry))
        response.data.responseGetCompetitionRanking.entries.competitionRankingEntry = [response.data.responseGetCompetitionRanking.entries.competitionRankingEntry];
      ranking.entries.push(...response.data.responseGetCompetitionRanking.entries.competitionRankingEntry.map(mapEntry));
      x += 50;
    }

    var currentRankings = await dataService.getRanking({competitionId: ranking.competitionId});
  
    var newTeamIds = [];
  
    for(const entry of ranking.entries){
      const currentEntry = currentRankings.entries.find(x => x.team.id === entry.team.id)
      if (!currentEntry) {
        newTeamIds.push(entry.team.id);
      }
      else {
        const currentTotalGamesPlayed = Number(currentEntry.win) + Number(currentEntry.draw) + Number(currentEntry.loss);
        const entryTotalGamesPlayed = Number(entry.win) + Number(entry.draw) + Number(entry.loss);
        if ( currentTotalGamesPlayed!==entryTotalGamesPlayed){
          newTeamIds.push(entry.team.id);
        }
      }
    }
    if (!currentRankings) dataService.insertRanking({competitionId: competitionId,entries: ranking.entries, total:ranking.entries.length});
    await dataService.updateRanking({competitionId: ranking.competitionId},{$set:{entries: ranking.entries}})

    return newTeamIds;
  }

  async updateSchedules (competition){
    let response = await axios.get(`${this.apiUrl}/api/competition/schedule/${competition.id}/${competition.day}`);

    const mapSchedule = schedule => {
      return {
        id: schedule.id,
        competitionId: competition.id,
        matchId: schedule.matches.match.id,
        round: competition.day,
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

    const schedules = response.data.responseGetCompetitionSchedule.schedule.contest.map(mapSchedule);

    for(const schedule of schedules){
      schedule.home.team.logo = await this.#getLogo(schedule.home.team.logo);
      schedule.away.team.logo = await this.#getLogo(schedule.away.team.logo);
      await dataService.updateSchedule({id:schedule.id},schedule,{upsert:true});
    }
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

      for(const competition of competitions){
        if (competition.format == 4) continue; //skip ladder for now

        competition.logo = await this.#getLogo(competition.logo);
        await dataService.updateCompetition({id:competition.id},competition,{upsert:true});
        
        if (competition.status === 3) {
          await this.updateSchedules(competition);
          await this.calculateStandings(competition.id);
        }
        if (competition.status >= 3)await this.updateMatches(competition.id);
        
      }
    }
    catch(e){
      console.error("something went wrong",e);
    }

    
  }

  async getTeams (newTeamIds){
    if (newTeamIds.length === 0) return;
    const teams = await dataService.getTeams({});
    if (newTeamIds.length === 0){
      newTeamIds = teams.map(x => x.id);
    }
    const newTeams = [];
    
    const logos = await dataService.getLogos();

    for(const teamId of newTeamIds){
      const response = await axios.get(`${this.apiUrl}/api/Team/${teamId}`);
      const team = response.data.responseGetTeam.team;

      const logo = logos.find(x => x.id.toLocaleLowerCase() == team.logo.itemId?.toLocaleLowerCase());
      team.logo.icon = logo ? `${logo.logo}.png` : `Logo_Human_01.png`;
      newTeams.push(team);
    }
  
    for(const team of newTeams){
      const response = await axios.get(`${this.apiUrl}/api/Team/${team.id}/roster`);
  
      team.treasury = response.data.responseGetTeamRoster.roster.treasury;
      team.roster = response.data.responseGetTeamRoster.roster.slots.teamRosterSlot;
      team.improvements = response.data.responseGetTeamRoster.roster.improvements.teamRosterImprovementsEntry;
    }
    for(var team of newTeams){
      if (teams.some(x => x.id == team.id)) {
        await dataService.updateTeam({id:team.id},team,{upsert:true});
      } else {
        await dataService.insertTeam(team);
      }
    }
    
    console.log("teams completed");
  }

  async updateMatches (competitionId){
    const schedules = await dataService.getSchedules({competitionId:competitionId});

    let teamIds = schedules.map(x => x.home.team.id).concat(schedules.map(x => x.away.team.id));
    teamIds = [...new Set(teamIds)];

    await this.getTeams(teamIds);

    const matchIds = (await dataService.getMatches({"competition.id":competitionId},{projection:{matchId:1, _id:0}})).map(x => x.matchId);

    const matches = await this.getMatchIdsByTeam(teamIds,matchIds, competitionId);
    for(const gameId of matches){
      let response  = await axios.get(`${this.apiUrl}/api/game/${gameId}`);
      const match = response.data.responseGetGameResult.gameResult;
  
      response = await axios.get(`${this.apiUrl}/api/statistics/match/${gameId}`);
      match.statistics = response.data.responseGetMatchStatistics.matchStatistics;
  
      response = await axios.get(`${this.apiUrl}/api/game/${gameId}/spp`);
      match.spp = response.data.responseGetSppResult.sppResult;
  
      match.homeTeam.logo.icon = await this.#getLogo(match.homeTeam.logo.itemId);
      match.awayTeam.logo.icon = await this.#getLogo(match.awayTeam.logo.itemId);
  
      try{
        let playerIds = match.spp.homeTeamSppResult.playerSppResults.playerSppResult.map(x => x.player);
        /*match.statistics.homeGamerStatistics.teamStatistics.playerStatistics =*/ await this.updatePlayerStatistics(playerIds, match.homeTeam.id);
        playerIds = match.spp.awayTeamSppResult.playerSppResults.playerSppResult.map(x => x.player);
        /*match.statistics.awayGamerStatistics.teamStatistics.playerStatistics =*/ await this.updatePlayerStatistics(playerIds, match.awayTeam.id);
      }
      catch(ex){
        console.dir(ex);
      }
      
      await dataService.insertMatch(match);
    }
    
    console.log("matches completed");

  }

  async updatePlayerStatistics(playerIds, teamId){
    const stats = [];
    for(const matchPlayer of playerIds){
      const response = await axios.get(`${this.apiUrl}/api/statistics/player/${matchPlayer.id}`);
      
      const current_statistics = response.data.responseGetPlayerStatistics.playerStatistics.statistics.statistic.map(this.#mapStatistic);
      let player = await dataService.getPlayer({id:matchPlayer.id});

      if (!player) {
        player = {};
        player = Object.assign(player, matchPlayer);
        player.teamId = teamId;
      }
      /*
      if (!player.statistics){
        stats.push({id:player.id, statistics:current_statistics});
      } else {  
        let playerStats = {id:player.id, statistics:[]};
        for (const stat of current_statistics){
          if (player.statistics.some(x => x.id === stat.id)){
            // update but also get diff for the match
            let new_stat = {};
            new_stat = Object.assign(stat);
            const player_stat = player.statistics.find(x => x.id === stat.id);
            new_stat.value -= player_stat.value;
            if (new_stat.total) new_stat.total =player_stat.total;
            playerStats.statistics.push(new_stat);
          } else {
            //add
            playerStats.statistics.push(stat);
          }
        }
        stats.push({id:player.id, statistics:playerStats});
      }*/
      player.statistics = current_statistics;
      await dataService.updatePlayer({id:player.id},player,{upsert:true});
    }
    //return stats;
  }

  async getMatchIdsByTeam (teamIds, matchIds, competitionId) 
  {
    let matches = [];

    for(const id of teamIds){
      const team = await dataService.getTeam({id:id});
      if (!team) continue;
      let x = 0;
      let response = await axios.get(`${this.apiUrl}/api/game/teammatches/${team.id}/1/${x}`);
      const total = response.data.responseGetTeamMatchHistory.total;
      if(!response.data.responseGetTeamMatchHistory.matchHistory.gameData) continue;
  
      const teamMatchId = response.data.responseGetTeamMatchHistory.matchHistory.gameData.matchId;
  
      let oldMatchFound = matchIds.some(x => x == teamMatchId);
      let newMatch = null;
      if (response.data.responseGetTeamMatchHistory.matchHistory.gameData.competition.id === competitionId && matchIds.indexOf(teamMatchId) === -1)
      {
        newMatch = response.data.responseGetTeamMatchHistory.matchHistory.gameData;
      }
      
      if (newMatch){
         matches.push(newMatch.gameId);
         if (!team.matches) team.matches = [];
         team.matches.push(newMatch.matchId);
      }
      
      x += 1;
      while (!oldMatchFound && x < total){
        response = await axios.get(`${this.apiUrl}/api/game/teammatches/${team.id}/1/${x}`);
  
        const teamMatchId = response.data.responseGetTeamMatchHistory.matchHistory.gameData.matchId;
    
        oldMatchFound = matchIds.some(x => x == teamMatchId);
        
        let newMatch = null;
        if (response.data.responseGetTeamMatchHistory.matchHistory.gameData.competition.id === competitionId && matchIds.indexOf(teamMatchId) === -1)
        {
          newMatch = response.data.responseGetTeamMatchHistory.matchHistory.gameData;
        }
  
        if (newMatch){
          matches.push(newMatch.gameId);
          if (!team.matches) team.matches = [];
          team.matches.push(newMatch.matchId);
        }
         x += 1;
      }
  
      await dataService.updateTeam({id:team.id},{$set:{matches:team.matches}});
    }      
    return [...new Set(matches)];
  }

  async updateLadderMatches(newTeamIds, competitionId){
    if (newTeamIds.length === 0){
      newTeamIds = (await dataService.getTeams({},{projection:{id:1, _id:0}})).map(x => x.id);
    }
  
    const matchIds = (await dataService.getMatches({"competition.id":competitionId},{projection:{matchId:1, _id:0}})).map(x => x.matchId);
    let matches = [];
    for(const id of newTeamIds){
      const team = await dataService.getTeam({id:id});
      if (!team) continue;
      let x = 0;
      let response = await axios.get(`${this.apiUrl}/api/game/teammatches/${team.id}/1/${x}`);
      const total = response.data.responseGetTeamMatchHistory.total;
      if(!response.data.responseGetTeamMatchHistory.matchHistory.gameData) continue;
  
      const teamMatchId = response.data.responseGetTeamMatchHistory.matchHistory.gameData.matchId;
  
      let oldMatchFound = matchIds.some(x => x == teamMatchId);
      let newMatch = null;
      if (response.data.responseGetTeamMatchHistory.matchHistory.gameData.competition.id === competitionId && matchIds.indexOf(teamMatchId) === -1)
      {
        newMatch = response.data.responseGetTeamMatchHistory.matchHistory.gameData;
      }
      
      if (newMatch){
         matches.push(newMatch.gameId);
         if (!team.matches) team.matches = [];
         team.matches.push(newMatch.matchId);
      }
      
      x += 1;
      while (!oldMatchFound && x < total){
        response = await axios.get(`${this.apiUrl}/api/game/teammatches/${team.id}/1/${x}`);
  
        const teamMatchId = response.data.responseGetTeamMatchHistory.matchHistory.gameData.matchId;
    
        oldMatchFound = matchIds.some(x => x == teamMatchId);
        
        let newMatch = null;
        if (response.data.responseGetTeamMatchHistory.matchHistory.gameData.competition.id === competitionId && matchIds.indexOf(teamMatchId) === -1)
        {
          newMatch = response.data.responseGetTeamMatchHistory.matchHistory.gameData;
        }
  
        if (newMatch){
          matches.push(newMatch.gameId);
          if (!team.matches) team.matches = [];
          team.matches.push(newMatch.matchId);
        }
         x += 1;
      }
  
      await dataService.updateTeam({id:team.id},{$set:{matches:team.matches}});
    }  
    matches = [...new Set(matches)];
    for(const gameId of matches){
      let response  = await axios.get(`${this.apiUrl}/api/game/${gameId}`);
      const match = response.data.responseGetGameResult.gameResult;
  
      response = await axios.get(`${this.apiUrl}/api/statistics/match/${gameId}`);
      match.statistics = response.data.responseGetMatchStatistics.matchStatistics;
  
      response = await axios.get(`${this.apiUrl}/api/game/${gameId}/spp`);
      match.spp = response.data.responseGetSppResult.sppResult;
  
      match.homeTeam.logo.icon = await this.#getLogo(match.homeTeam.logo.itemId);
      match.awayTeam.logo.icon = await this.#getLogo(match.awayTeam.logo.itemId);
  
      await dataService.insertMatch(match);
    }
    
    console.log("matches completed");
    return matches;
  }

  async calculateLadderStandings(competitionId){
    const limit =42, gamesBonus= 0.02, win =	100, conDraw = 50, RefPoint =	28, RefPerc =	0.05, CrossPoint =	0.2;
    const expo = Math.log(RefPerc/(1-CrossPoint))/Math.log(1-RefPoint/limit);
  
    const ranking = await dataService.getRanking({competitionId:competitionId});
  
    ranking.entries.forEach(x => {
      const gamesPlayed = Number(x.win)+Number(x.draw)+Number(x.loss);
  
      const winPercentage=(Number(x.win)*win+Number(x.draw)*conDraw)/gamesPlayed;
  
      const limFactor = CrossPoint+(1-CrossPoint)*(1-Math.pow (1-0.5*(gamesPlayed+limit-Math.sqrt(Math.pow(gamesPlayed-limit,2)))/limit, expo));
  
      x.score = winPercentage * limFactor + gamesPlayed*gamesBonus;
    })
  
    await dataService.updateRanking({competitionId:competitionId},{$set:{"entries": ranking.entries}});
  }

  async calculateStandings(competitionId){
    let initMatches = await dataService.getSchedules({competitionId, "status":1, round:1});

    let matches = await dataService.getSchedules({competitionId, "status":{$ne:1}});
    let coaches = [];


    for(let match of  initMatches){

      [match.home, match.away].map(opponent => coaches.push({
          id: opponent.coach.id,
          name: opponent.coach.name,
          team: opponent.team.name,
          teamId: opponent.team.id,
          logo: opponent.team.logo,
          race: opponent.team.race,
          points: 0,
          games: 0,
          win: 0,
          loss: 0,
          draw: 0,
          tddiff: 0,
          progression:[]
      }
      ));

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
            winner = this.#newScore(winningTeam,3,winningTeam.score - losingTeam.score); 
            coaches.push(winner);
        } else {
            winner.games++;
            winner.win++;
            winner.points += 3;
            winner.tddiff += winningTeam.score - losingTeam.score;
        }

        //process loser
        if(!loser){
          loser = this.#newScore(losingTeam,0,losingTeam.score-winningTeam.score); 
          coaches.push(loser);
        } else {
          loser.games++;
          loser.loss++;
          loser.tddiff += losingTeam.score - winningTeam.score;
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
    coaches.map(coach => coach.progression.push(coach.position));
    
    await dataService.updateCompetition({id:competitionId},{$set:{standings:coaches}});
  }

  async #getLogo(logoId){

    if (this.logos.length == 0) this.logos = await dataService.getLogos();

    const logo = this.logos.find(x => x.id.toLocaleLowerCase() == logoId?.toLocaleLowerCase());

    return logo ? `${logo.logo}.png` : `Logo_Human_01.png`;
  }

  #newScore(opponent, points, tdDiff){
    return {
        id: opponent.coach.id,
        name: opponent.coach.name,
        team: opponent.team.name,
        teamId: opponent.team.id,
        logo:opponent.team.logo,
        race: opponent.team.race,
        points: points,
        games: 1,
        win: points === 3 ? 1 :0,
        loss: points === 0 ? 1 :0,
        draw: points === 1 ? 1 :0,
        tddiff: tdDiff,
        progression:[]
    };
  } 

  #mapStatistic(stat){
    return {
        id: Number(stat.id),
        categoryId: Number(stat.categoryId),
        name: stat.name,
        categoryName: stat.categoryName,
        value: stat.value
    }
  }

  #getRace(raceId){
    switch (raceId){
    case 1: return "Human";
    case 2: return "Dwarf";
    case 3: return "Skaven";
    case 4: return "Orc";
    case 5: return "Lizardman";
    case 6: return "Goblin";
    case 7: return "WoodElf";
    case 8: return "Chaos Chosen";
    case 9: return "Dark Elf";
    case 10: return "Shambling Undead";
    case 11: return "Halfling";
    case 14: return "Elven Union";
    case 17: return "Necromantic Horror";
    case 18: return "Nurgle";
    case 22: return "Underworld Denizen";
    case 23: return "Khorne";
    case 24: return "Imperial Nobility";
    case 29: return "Slaanesh";
    case 1000: return "Black Orc";
    case 1001: return "Chaos Renegade";
    case 1002: return "OldWorld Alliance";
    case 1004: return "Tzeentch";
    default: return `${raceId} unknown`;
  }
}

}

module.exports = new BB3Service();
