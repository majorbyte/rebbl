"use strict";
const axios = require("axios"),
 dataService = require("./DataServiceBB3.js").rebbl3;


class BB3Service{
  constructor(){
    this.apiUrl = process.env["BB3Url"];
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
    ranking.entries.push(...response.data.responseGetCompetitionRanking.entries.competitionRankingEntry.map(mapEntry));
    x += 50;
    while (x < ranking.total){
      response = await axios.get(`${this.apiUrl}/api/competition/ranking/${competitionId}/50/${x}`);
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
  
  getTeams = async function(newTeamIds){
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
        await dataService.updateTeam({id:team.id}, {$set:team});
      } else {
        await dataService.insertTeam(team);
      }
    }
    
    console.log("teams completed");
  }

  updateMatches = async function(newTeamIds, competitionId){
    
    const logos = await dataService.getLogos();

    if (newTeamIds.length === 0){
      newTeamIds = (await dataService.getTeams({},{projection:{id:1, _id:0}})).map(x => x.id);
    }
  
    const matchIds = (await dataService.getMatches({},{projection:{matchId:1, _id:0}})).map(x => x.matchId);
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
  
      const homeLogo = logos.find(x => x.id.toLocaleLowerCase() == match.homeTeam.logo.itemId?.toLocaleLowerCase());
      const awayLogo = logos.find(x => x.id.toLocaleLowerCase() == match.awayTeam.logo.itemId?.toLocaleLowerCase());
  
      match.homeTeam.logo.icon = homeLogo ? `${homeLogo.logo}.png` : `Logo_Human_01.png`;
      match.awayTeam.logo.icon = awayLogo ? `${awayLogo.logo}.png` : `Logo_Human_01.png`;
  
      await dataService.insertMatch(match);
    }
    
    console.log("matches completed");
    return matches;
  }

  calculateStandings = async function(competitionId){
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

}

module.exports = new BB3Service();
