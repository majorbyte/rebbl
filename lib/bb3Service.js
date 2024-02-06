"use strict";
const axios = require("axios"),
 dataService = require("./DataServiceBB3.js").rebbl3;


class BB3Service{
  constructor(){
    this.apiUrl = process.env["BB3Url"];
    this.logos = [];
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
  

  updateSchedules = async function(competition){
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
      schedule.home.team.logo = await this._getLogo(schedule.home.team.logo);
      schedule.away.team.logo = await this._getLogo(schedule.away.team.logo);
      await dataService.updateSchedule({id:schedule.id},schedule,{upsert:true});
    }
  }

  updateCompetitions = async function(leagueId){
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
        competition.logo = await this._getLogo(competition.logo);
        await dataService.updateCompetition({id:competition.id},competition,{upsert:true});
        if (competition.status === 3) await this.updateSchedules(competition);
        if (competition.status >= 3 && competition.format == 2)await this.updateMatches(competition.id);
      }
    }
    catch(e){
      console.error("something went wrong",e);
    }

    
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
        await dataService.updateTeam({id:team.id},team,{upsert:true});
      } else {
        await dataService.insertTeam(team);
      }
    }
    
    console.log("teams completed");
  }

  updateMatches = async function(competitionId){
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
  
      match.homeTeam.logo.icon = await this._getLogo(match.homeTeam.logo.itemId);
      match.awayTeam.logo.icon = await this._getLogo(match.awayTeam.logo.itemId);
  
      await dataService.insertMatch(match);
    }
    
    console.log("matches completed");

  }

  getMatchIdsByTeam = async function(teamIds, matchIds, competitionId) 
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


  updateLadderMatches = async function(newTeamIds, competitionId){
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
  
      match.homeTeam.logo.icon = await this._getLogo(match.homeTeam.logo.itemId);
      match.awayTeam.logo.icon = await this._getLogo(match.awayTeam.logo.itemId);
  
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


  _getLogo = async function(logoId){

    if (this.logos.length == 0) this.logos = await dataService.getLogos();

    const logo = this.logos.find(x => x.id.toLocaleLowerCase() == logoId?.toLocaleLowerCase());

    return logo ? `${logo.logo}.png` : `Logo_Human_01.png`;
  }

}

module.exports = new BB3Service();
