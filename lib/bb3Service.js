"use strict";
const accountService = require("./accountService.js"),
adminBB3Service = require("./adminBB3Service.js"),
apiService = require("./apiBB3Service.js"),
cyanideService = require("./CyanideService.js"),
dataService = require("./DataServiceBB3.js").rebbl3,
datingService = require("./DatingService.js"),
fs = require('fs/promises'),
loggingService = require("./loggingService.js");

class BB3Service{
  constructor(){
    this.apiUrl = process.env["BB3Url"];
    this.logos = [];
    this.skills = [];
    this.clanRaces = [];
  }

  #ensureArray = obj => Array.isArray(obj) ? obj : [obj];
    

  async searchTeams(coachId,teamName){
    let x = 0;
    let response = await fetch(`${this.apiUrl}/api/team/gamer/${coachId}/search/${teamName}/10/${x}`);
    if (!response.ok) return [];
    let responseGetTeams = (await response.json()).responseGetTeams;

    const total = Number(responseGetTeams.total);

    if (total ===0) return [];
    const mapEntry = entry => {
      return {
        id : entry.id,
        name : entry.name,
        value :entry.value,
        race: this.#getRace(Number(entry.race)),
        experienced : Number(entry.experienced) === 1,
        custom : Number(entry.isCustom) === 1
      }
    }

    responseGetTeams.teams.team = this.#ensureArray(responseGetTeams.teams.team); //if (!Array.isArray(responseGetTeams.teams.team)) responseGetTeams.teams.team = [responseGetTeams.teams.team];
    let teams = responseGetTeams.teams.team.map(mapEntry);
    while(x+10 < total){
      x += 10;
      response = await fetch(`${this.apiUrl}/api/team/gamer/${coachId}/search/${teamName}/10/${x}`);
      if (!response.ok) break;
      responseGetTeams = (await response.json()).responseGetTeams;

      responseGetTeams.teams.team = this.#ensureArray(responseGetTeams.teams.team); //if (!Array.isArray(responseGetTeams.teams.team)) responseGetTeams.teams.team = [responseGetTeams.teams.team];
      teams = teams.concat(responseGetTeams.teams.team.map(mapEntry));
    }

    return teams;
  }

  async updateCoaches() {
    let accounts = (await accountService.getBB3Accounts()).filter(x => x.bb3id !== "")
    
    for(const account of accounts) account.info = await this.#updateCoachInfo(account.bb3id);
    accounts = accounts.filter(x => x.info);
    for(const account of accounts) await accountService.updateBB3Info(account.bb3id, account.info);
  }
  

  async #updateCoachInfo(coachId){
    const data = await apiService.gamerInfo(coachId);
    if (data == null || data.gamers.gamer == null) return null;
    const gamer = data.gamers.gamer;
    return {
      avatar: gamer.avatar.split(".")[1],
      banner: gamer.banner.split(".")[1],
      frame: gamer.frame.split(".")[1],
      level : Number(gamer.progression.level),
      progression: gamer.progression,
      title : gamer.title
    }
  
    
  }

  async getRanking(competitionId){
    let x = 0;
    let response = await fetch(`${this.apiUrl}/api/competition/ranking/${competitionId}/50/${x}`);
    if (!response.ok) return [];
    let responseGetCompetitionRanking = (await response.json()).responseGetCompetitionRanking;

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
      competitionId:responseGetCompetitionRanking.competition.id,
      total: responseGetCompetitionRanking.total,
      entries:[]
    }
    responseGetCompetitionRanking.entries.competitionRankingEntry = this.#ensureArray(responseGetCompetitionRanking.entries.competitionRankingEntry); //if (!Array.isArray(responseGetCompetitionRanking.entries.competitionRankingEntry)) responseGetCompetitionRanking.entries.competitionRankingEntry = [responseGetCompetitionRanking.entries.competitionRankingEntry];
    ranking.entries.push(...responseGetCompetitionRanking.entries.competitionRankingEntry.map(mapEntry));
    x += 50;
    while (x < ranking.total){
      response = await fetch(`${this.apiUrl}/api/competition/ranking/${competitionId}/50/${x}`);
      if (!response.ok) break;
      responseGetCompetitionRanking = (await response.json()).responseGetCompetitionRanking;
      responseGetCompetitionRanking.entries.competitionRankingEntry = this.#ensureArray(responseGetCompetitionRanking.entries.competitionRankingEntry); //if (!Array.isArray(response.data.responseGetCompetitionRanking.entries.competitionRankingEntry)) response.data.responseGetCompetitionRanking.entries.competitionRankingEntry = [response.data.responseGetCompetitionRanking.entries.competitionRankingEntry];
      ranking.entries.push(...responseGetCompetitionRanking.entries.competitionRankingEntry.map(mapEntry));
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

  async updateSchedules (competition, day){
    day = day ?? competition.day;
    let response = await fetch(`${this.apiUrl}/api/competition/schedule/${competition.id}/${day}`);
    if (!response.ok) {
      console.log(await response.json());
      return [];
    }
    let responseGetCompetitionSchedule = (await response.json()).responseGetCompetitionSchedule;

    const mapSchedule = schedule => {
      return {
        id: schedule.id,
        competitionId: competition.id,
        competitionName: competition.name,
        matchId: schedule.matches.match.id,
        gameId: schedule.matches.match.gameId ?? schedule.matches.match.id,
        round: day,
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

    if (typeof responseGetCompetitionSchedule.schedule === "string") return [];
    responseGetCompetitionSchedule.schedule.contest = this.#ensureArray(responseGetCompetitionSchedule.schedule.contest);// if (!Array.isArray(response.data.responseGetCompetitionSchedule.schedule.contest)) response.data.responseGetCompetitionSchedule.schedule.contest = [response.data.responseGetCompetitionSchedule.schedule.contest];
    const schedules = responseGetCompetitionSchedule.schedule.contest.map(mapSchedule);

    let parentCompetition;
    if (competition.parentId) parentCompetition = await dataService.getCompetition({id:competition.parentId});

    const updatedSchedules = [];
    for(const schedule of schedules){
      schedule.home.team.logo = await this.#getLogo(schedule.home.team.logo);
      schedule.away.team.logo = await this.#getLogo(schedule.away.team.logo);

      const existingSchedule = await dataService.getSchedule({id:schedule.id});
      if (existingSchedule && existingSchedule.manual) continue;

      const scheduleExists = existingSchedule != null;
      const teamChanged = scheduleExists && (existingSchedule.home.team.id != schedule.home.team.id || existingSchedule.away.team.id != schedule.away.team.id);
      const teamChangedButNotPlayed = teamChanged && schedule.status < 3;
      const homeTVChanged = scheduleExists && existingSchedule.home.team.valueWithJourneymen != schedule.home.team.valueWithJourneymen;
      const awayTVChanged = scheduleExists && existingSchedule.away.team.valueWithJourneymen != schedule.away.team.valueWithJourneymen; 
      
      if(!scheduleExists || existingSchedule.status != schedule.status || homeTVChanged || awayTVChanged || teamChangedButNotPlayed){
        if (scheduleExists && existingSchedule.gameId !== null && schedule.gameId === null) schedule.gameId == existingSchedule.gameId; 
        
        schedule.season = competition.season;

        if (competition.parentId){
          //delete schedule.id;
          //schedule.competitionName = parentCompetition.displayName || competition.name;
          //schedule.round = parseInt(competition.name.split(" ").pop().replace("R", ""));
          schedule.parentId = competition.parentId;
          //schedule.competitionId = competition.parentId;  
          const offset = parseInt(competition.name.split(" ").pop().split(".")[0]);
          schedule.round += (offset -1) * 3 ;
          //await dataService.updateSchedule({round:schedule.round, competitionId:schedule.competitionId, "home.coach.id":schedule.home.coach.id},schedule,{upsert:true});
        }
        await dataService.updateSchedule({id:schedule.id},schedule,{upsert:true});
        updatedSchedules.push(schedule);

      }
    }
    await dataService.deleteSchedules({competitionId:competition.id, round:Number(competition.day), status:0});
    return updatedSchedules;
  }

  async updateCompetitions (leagueId){
    try{
      let response = await fetch(`${this.apiUrl}/api/league/${leagueId}/competitions`);
      if (!response.ok) {
        console.log(await response.json());
        return [];
      }
      let responseGetCompetitions = (await response.json()).responseGetCompetitions;
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

      //const closedCompetitions = await dataService.getCompetitions({leagueId, status:4, closeHandled:true},{projection:{id:1}});
      let competitions = responseGetCompetitions.competitions.competition.map(mapCompetition);
      
      //competitions = competitions.filter(x => closedCompetitions.every(y => y.id !== x.id));

      for(let competition of competitions){
        if (competition.format === 4) continue; //skip ladder for now
        
        //if (competition.status === 4 && closedCompetitions.some(x => x.id === competition.id && x.closeHandled)) continue;

        let updatedSchedules= [];

        competition.logo = await this.#getLogo(competition.logo);
        await dataService.updateCompetition({id:competition.id},competition,{upsert:true});
        competition = await dataService.getCompetition({id:competition.id});

        if (competition.status >= 3) {
          updatedSchedules = await this.updateSchedules(competition);

          const openSchedules = await dataService.getSchedules({competitionId:competition.id, round: competition.day-1,status:{$lt:3}});
          if (openSchedules.length > 0){
            await this.updateSchedules(competition,competition.day-1);
          }
          
          await this.updateMatches(competition.id, updatedSchedules);


          if (competition.status === 4) await dataService.updateCompetition({id:competition.id},{$set: {closeHandled:true}});
        }
        await this.calculateStandings(competition.parentId ?? competition.id);
      }
    }
    catch(e){
      console.error("something went wrong",e);
    }
  }

  async calculateLeagueStandings(leagueId){

    const competitions = await dataService.getCompetitions({leagueId:leagueId,season:"season 4", isParent:true});
    const tasks = competitions.map(x => x.id).map(this.calculateStandings,this);
    await Promise.all( tasks);
  } 

  async getTeams (newTeamIds){
    if (newTeamIds.length === 0) return;

    const newTeams = [];
    
    const logos = await dataService.getLogos();

    for(const teamId of newTeamIds){
      try{
        const response = await fetch(`${this.apiUrl}/api/Team/${teamId}`);
        if (!response.ok) continue;
        const responseGetTeam = (await response.json()).responseGetTeam;
        const team = responseGetTeam.team;
  
        const logo = logos.find(x => x.id.toLocaleLowerCase() == team.logo.itemId?.toLocaleLowerCase());
        team.logo.icon = logo ? `${logo.logo}.png` : `Logo_Human_01.png`;
        newTeams.push(team);
      } catch (ex){
        console.log(ex.message);
      }
    }
  
    for(const team of newTeams){
      if (team.id == ""){
        continue;
      }
      const response = await fetch(`${this.apiUrl}/api/Team/${team.id}/roster`);
      if (!response.ok) continue;
      const responseGetTeamRoster = (await response.json()).responseGetTeamRoster;

      team.treasury = responseGetTeamRoster.roster.treasury;
      team.roster = responseGetTeamRoster.roster.slots.teamRosterSlot;
      team.improvements = responseGetTeamRoster.roster.improvements.teamRosterImprovementsEntry;
    }
    for(var team of newTeams){
      await dataService.updateTeam({id:team.id},team,{upsert:true});
    }
  }

  async updateTeams(leagueId){
    const logos = await dataService.getLogos();


    let response = await fetch(`${this.apiUrl}/api/league/${leagueId}/competitions`);
    if (!response.ok) {
      console.log(await response.json());
      return [];
    }
    let responseGetCompetitions = (await response.json()).responseGetCompetitions;
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

    const closedCompetitions = await dataService.getCompetitions({leagueId, status:4, closeHandled:true},{projection:{id:1}});
    let competitions = responseGetCompetitions.competitions.competition.map(mapCompetition);
    
    competitions = competitions.filter(x => closedCompetitions.every(y => y.id !== x.id));

    for(const competition of competitions){
      let response = await fetch(`${this.apiUrl}/api/competition/participants/${competition.id}/100/0`);
      if (!response.ok) continue;

      const responseGetCompetitionParticipants = (await response.json()).responseGetCompetitionParticipants;
      responseGetCompetitionParticipants.participants.competitionParticipant = this.#ensureArray(responseGetCompetitionParticipants.participants.competitionParticipant);

      for(const participant of responseGetCompetitionParticipants.participants.competitionParticipant){
        await this.#updateTeam(participant.team.id, logos);
      }
    }
  }

  async updateTeam(teamId, zfl){ 
    const logos = await dataService.getLogos();

    this.#updateTeam(teamId,logos,zfl);
  }

  async #updateTeam(teamId, logos,zfl){
    let response = await fetch(`${this.apiUrl}/api/Team/${teamId}`);
    if (!response.ok) return;
    const team = (await response.json()).responseGetTeam.team;

    const logo = logos.find(x => x.id.toLocaleLowerCase() == team.logo.itemId?.toLocaleLowerCase());
    team.logo.icon = logo ? `${logo.logo}.png` : `Logo_Human_01.png`;

    response = await fetch(`${this.apiUrl}/api/Team/${team.id}/roster`);
    if (!response.ok) return;
    const responseGetTeamRoster = (await response.json()).responseGetTeamRoster;

    team.treasury = responseGetTeamRoster.roster.treasury;
    team.roster = responseGetTeamRoster.roster.slots.teamRosterSlot;
    team.improvements = responseGetTeamRoster.roster.improvements.teamRosterImprovementsEntry;

    if (zfl) await dataService.updateZFLTeam({id:team.id},team,{upsert:true});
    else await dataService.updateTeam({id:team.id},team,{upsert:true});
  }

  async checkUnvalidatedMatchState(){

    let matches = await dataService.getMatches({$and:[{homeValidation:"0"},{awayValidation:"1"}]});
    matches = matches.concat(await dataService.getMatches({$and:[{homeValidation:"1"},{awayValidation:"0"}]}));

    for(let m of matches){

      const response  = await fetch(`${this.apiUrl}/api/game/${m.gameId}`);
      if(!response.ok) continue;
      const match = (await response.json()).responseGetGameResult.gameResult;

      await dataService.updateMatch({gameId:m.gameId},{$set:{"hasPendingValidation":match.hasPendingValidation,"awayValidation":match.awayValidation,"homeValidation":match.homeValidation }});
    }
  }

  async updateMatches (competitionId,schedules){
    //const schedules = await dataService.getSchedules({competitionId:competitionId});
    schedules = schedules.filter(x => x.status > 1);
    if (schedules.length === 0) return;

    if (this.skills.length === 0) this.skills = await dataService.getSkills();

    let teamIds = schedules.map(x => x.home.team.id).concat(schedules.map(x => x.away.team.id));
    teamIds = [...new Set(teamIds)];

    await this.getTeams(teamIds);

    //const matchIds = (await dataService.getMatches({"competition.id":competitionId},{projection:{matchId:1, _id:0}})).map(x => x.matchId);
    //const matches = await this.getMatchIdsByTeam(teamIds,matchIds, competitionId);
    
    const gameIds = schedules.map(x => x.gameId);
    for(const gameId of gameIds){
      if(!gameId) continue;

      const exists = await dataService.getMatch({gameId:gameId});
      if (exists) continue;


      let response  = await fetch(`${this.apiUrl}/api/game/${gameId}`);
      if (!response.ok) continue;
      const match = (await response.json()).responseGetGameResult.gameResult;
  
      response = await fetch(`${this.apiUrl}/api/statistics/match/${gameId}`);
      if (response.ok) match.statistics = (await response.json()).responseGetMatchStatistics.matchStatistics;
 
      response = await cyanideService.match({bb:3, match_id:match.gameId});

      match.homeTeam.logo.icon = this.#getCyanideLogo(response.match.teams[0].teamlogo) + '.png';
      match.awayTeam.logo.icon = this.#getCyanideLogo(response.match.teams[1].teamlogo) + '.png';

      match.homeTeam.roster = this.#parseRoster(response.match.teams[0].roster);
      match.awayTeam.roster = this.#parseRoster(response.match.teams[1].roster);

      // try{
      //   if (!Array.isArray(match.spp.homeTeamSppResult.playerSppResults.playerSppResult)) match.spp.homeTeamSppResult.playerSppResults.playerSppResult = [match.spp.homeTeamSppResult.playerSppResults.playerSppResult];
      //   let playerIds = match.spp.homeTeamSppResult.playerSppResults.playerSppResult.map(x => x.player);
      //   /*match.statistics.homeGamerStatistics.teamStatistics.playerStatistics =*/ await this.updatePlayerStatistics(playerIds, match.homeTeam.id);
      //   if (!Array.isArray(match.spp.awayTeamSppResult.playerSppResults.playerSppResult)) match.spp.awayTeamSppResult.playerSppResults.playerSppResult = [match.spp.awayTeamSppResult.playerSppResults.playerSppResult];
      //   playerIds = match.spp.awayTeamSppResult.playerSppResults.playerSppResult.map(x => x.player);
      //   /*match.statistics.awayGamerStatistics.teamStatistics.playerStatistics =*/ await this.updatePlayerStatistics(playerIds, match.awayTeam.id);
      // }
      // catch(ex){
      //   console.dir(ex);
      // }
      
      await dataService.insertMatch(match);
      const homeTeam = await dataService.getTeam({id:match.homeTeam.id});
      const awayTeam = await dataService.getTeam({id:match.awayTeam.id});
      for(const team of [homeTeam,awayTeam]){
        if(!team.matches) team.matches = [];
        team.matches.push(match.gameId);
        await dataService.updateTeam({id:team.id},{$set:{matches:team.matches}});
      }

      let players = match.homeTeam.roster || [];
      players = players.filter(player => player.casualties.some(cas => cas >= 5 && cas < 10)).map(x => x?.id);
      await dataService.updateTeam({id:match.homeTeam.id},{$set:{allowRetire:players}});
      players = match.awayTeam.roster || [];
      players = players.filter(player => player.casualties.some(cas => cas >= 5 && cas < 10)).map(x => x?.id);
      await dataService.updateTeam({id:match.awayTeam.id},{$set:{allowRetire:players}});

      const schedule = schedules.find(x => x.gameId == gameId);
      await this.#downloadReplay(schedule);

      await this.handleRetiredPlayers(competitionId, match.homeTeam.id);
      await this.handleRetiredPlayers(competitionId, match.awayTeam.id);
    }
  }

  async correctMatch(matchId){
    if (this.skills.length === 0 ) this.skills = await dataService.getSkills();
    const match = await dataService.getMatch({matchId});

    const response = await cyanideService.match({bb:3, match_id:match.gameId});

    match.homeTeam.logo.icon = this.#getCyanideLogo(response.match.teams[0].teamlogo) + '.png';//await this.#getLogo(match.homeTeam.logo.itemId);
    match.awayTeam.logo.icon = this.#getCyanideLogo(response.match.teams[1].teamlogo) + '.png';//await this.#getLogo(match.awayTeam.logo.itemId);


    //match.homeTeam.roster = this.#parseRoster(response.match.teams[0].roster);
    //match.awayTeam.roster = this.#parseRoster(response.match.teams[1].roster);

    await dataService.updateMatch({gameId:match.gameId},match,{upsert:true});

  }

  async getAllSkills(){
    if (this.skills.length ===0 ){
      this.skills = await dataService.getSkills({});
    }
    return this.skills; 
  }
  async getClanRaces(){
    if (this.clanRaces.length ===0 ){
      this.clanRaces = await dataService.getClanRaces({});
    }
    return this.clanRaces; 
  }

  async updatePlayerStatistics(playerIds, teamId){
    const stats = [];
    for(const matchPlayer of playerIds){
      const response = await fetch(`${this.apiUrl}/api/statistics/player/${matchPlayer.id}`);
      if (!response.ok) continue;
      
      const current_statistics = (await response.json()).responseGetPlayerStatistics.playerStatistics.statistics.statistic.map(this.#mapStatistic);
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
      let response = await fetch(`${this.apiUrl}/api/game/teammatches/${team.id}/1/${x}`);
      if (!response.ok) continue;
      const responseGetTeamMatchHistory = (await response.json()).responseGetTeamMatchHistory;
      const total = responseGetTeamMatchHistory.total;
      if(!responseGetTeamMatchHistory.matchHistory.gameData) continue;
  
      const teamMatchId = responseGetTeamMatchHistory.matchHistory.gameData.matchId;
  
      let oldMatchFound = matchIds.some(x => x == teamMatchId);
      let newMatch = null;
      if (responseGetTeamMatchHistory.matchHistory.gameData.competition.id === competitionId && matchIds.indexOf(teamMatchId) === -1)
      {
        newMatch = responseGetTeamMatchHistory.matchHistory.gameData;
      }
      
      if (newMatch){
         matches.push(newMatch.gameId);
         if (!team.matches) team.matches = [];
         team.matches.push(newMatch.gameId);
      }
      
      x += 1;
      while (!oldMatchFound && x < total){
        response = await fetch(`${this.apiUrl}/api/game/teammatches/${team.id}/1/${x}`);
        if (!response.ok) continue;
        const responseGetTeamMatchHistory = await (response.json()).responseGetTeamMatchHistory;
        const teamMatchId = responseGetTeamMatchHistory.matchHistory.gameData.matchId;
    
        oldMatchFound = matchIds.some(x => x == teamMatchId);
        
        let newMatch = null;
        if (responseGetTeamMatchHistory.matchHistory.gameData.competition.id === competitionId && matchIds.indexOf(teamMatchId) === -1)
        {
          newMatch = responseGetTeamMatchHistory.matchHistory.gameData;
        }
  
        if (newMatch){
          matches.push(newMatch.gameId);
          if (!team.matches) team.matches = [];
          team.matches.push(newMatch.gameId);
        }
         x += 1;
      }
  
      await dataService.updateTeam({id:team.id},{$set:{matches:team.matches}});
    }      
    return [...new Set(matches)];
  }
 
  async calculateStandings(competitionId){
    let initMatches = await dataService.getSchedules({ "status":1, round:1, $or:[{competitionId:competitionId},{parentId:competitionId}] });

    let matches = await dataService.getSchedules({ "status":{$gt:1}, $or:[{competitionId:competitionId},{parentId:competitionId}]});

    const competition = await dataService.getCompetition({id:competitionId},{projection:{id:1, name:1, day:1,season:1}})
    /*const swissSchedules = await dataService.getSchedules({competitionName:new RegExp(`${competition.name} R`), season:competition.season, "status":{$gt:1}});

    if (swissSchedules.length > 0){ 
      matches = matches.concat(swissSchedules);
    }*/

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

    coaches = coaches.filter(coach => coach.id !== "00000000-0000-0000-0000-000000000000");  
    coaches.map((coach,index) => coach.position = index+1);
    coaches.map(coach => coach.progression.push(coach.position));
    
    await dataService.updateCompetition({id:competitionId},{$set:{standings:coaches}});

    for(const coach of coaches){
      await dataService.updateTeam({id:coach.teamId},{$set:{coach:{id:coach.id,name:coach.name}}});
    }
  }

  async getUpcomingMatch(_redditUser,_coachId, competitionId){
    let user=String(_redditUser);
    let coachId=String(_coachId);


    let schedules = [];

    if (user != "null"){
      const account = await accountService.getAccount(user);
      coachId = account.bb3id;
    }

    schedules = await dataService.getSchedules({"home.coach.id": coachId, "status":{$in:[0,1]},$or:[{competitionId},{parentId:competitionId}]}); //1 == scheduled
    schedules = schedules.concat( await dataService.getSchedules({"away.coach.id": coachId, "status":{$in:[0,1]},$or:[{competitionId},{parentId:competitionId}]} ));
    for(let i = schedules.length-1; i>=0; i--){
      if(schedules[i].home.coach.id === coachId ){
        if(/^\[admin].+/i.test(schedules[i].home.team.name)){
          schedules.splice(i,1);
          continue;
        }
      }
  
      if (schedules[i].away.coach.id === coachId){
        if(/^\[admin].+/i.test(schedules[i].away.team.name)){
          schedules.splice(i,1);
        }
      }
    }

    schedules = schedules.sort(function(a,b){
      return a.round > b.round ? 1 : a.round < b.round ? -1 : 0;
    });

    schedules = this.#groupBy(schedules, "competitionId");

    let matches = [];

    for(let key in schedules){

      let match = await this.#unplayedMatch(schedules[key][0]);
      match.bb3 = true;
      match.date = await datingService.getDate(match.matchId);
      matches.push(match);
    }


    // I still have no idea how ZFL matches pop up here :/
    return matches.filter(m => m.competitionName && !m.competitionName.startsWith("ED") && !m.competitionName.startsWith("SD") );
  }

  async getUnplayedMatch(matchId){
    //normal
    let match = await dataService.getSchedule({matchId});
    if (!match) return [];
    match = await this.#unplayedMatch(match);    
    match.date = await datingService.getDate(match.matchId);
    return [match];
  }

  async processMatch(gameId, user, valid){
    const match = await dataService.getMatch({gameId});
    const isAdmin = user.roles && user.roles.indexOf("admin") > -1;
    const isCoach = match.homeGamer.id === user.bb3id || match.awayGamer.id === user.bb3id;
    if (!isAdmin && !isCoach) return match;

    if (!valid) {
      await this.#invalidateMatch(match,user);
      return;
    }

    await this.#validateMatch(match,user);

    if (match.validatedBy && match.validatedBy.length > 1 ){
      await adminBB3Service.validateMatch(null,match.competition.id, match.matchId);
      match.validated = true;
      await dataService.updateMatch({matchId:match.matchId},{$set:{validated:match.validated}});
    } else if (isAdmin && !isCoach) {
      // (isAdmin && !isCoach) -> don't automatically admin-validate your own games
      await adminBB3Service.validateMatch(null,match.competition.id, match.matchId);
      match.validated = true;
      match.validatedBy = match.validatedBy 
        ? match.validatedBy.concat([user.bb3id]) 
        : [[user.bb3id]]; 
      await dataService.updateMatch({matchId:match.matchId},{$set:{validated:match.validated}});
    }
    return match;
  }

  async processMatchBySchedule(gameId, user, valid){
    const schedules = await dataService.getSchedules({gameId});
    let schedule = null;
    if (schedules.length > 1){
      schedule = schedules.find(x => x.competitionName.indexOf(" R") > -1);
    } else {
      schedule = schedules[0];
    }

    const isAdmin = user.roles && user.roles.indexOf("admin") > -1;
    const isCoach = schedule.home.coach.id === user.bb3id || schedule.away.coach.id === user.bb3id;
    if (!isAdmin && !isCoach) return schedule;

    if (!valid) {
      await this.#invalidateSchedule(schedule,user);
      return schedule;
    }

    await this.#validateSchedule(schedule,user);

    if (schedule.validatedBy && schedule.validatedBy.length > 1 ){
      await adminBB3Service.validateMatch(null,schedule.competitionId, schedule.matchId);
      schedule.validated = true;
      await dataService.updateSchedule({matchId:schedule.matchId},{$set:{validated:schedule.validated}});
    } else if (isAdmin && !isCoach) {
      // (isAdmin && !isCoach) -> don't automatically admin-validate your own games
      await adminBB3Service.validateMatch(null,schedule.competitionId, schedule.matchId);
      schedule.validated = true;
      schedule.validatedBy = schedule.validatedBy 
        ? schedule.validatedBy.concat([user.bb3id]) 
        : [[user.bb3id]]; 
      await dataService.updateSchedule({matchId:schedule.matchId},{$set:{validated:schedule.validated}});
    }
    return schedule;
  }

  async advanceCompetition(competitionId){
    let response = await fetch(`${this.apiUrl}/api/competition/${competitionId}`);
    if (!response.ok) return;
    let responseGetCompetition = (await response.json()).responseGetCompetition;
    let scheduleResponse = await fetch(`${this.apiUrl}/api/competition/schedule/${responseGetCompetition.competition.id}/${responseGetCompetition.competition.day}`);
    if (!scheduleResponse.ok) return;
    const responseGetCompetitionSchedule = (await scheduleResponse.json()).responseGetCompetitionSchedule;

    const canAdvance = responseGetCompetitionSchedule.schedule.contest.every(x => x.matches.match.status === "3" || x.matches.match.status === "4" );
    if (!canAdvance) return;

    await fetch(`${this.apiUrl}/api/competition/${competitionId}/advance`,{method: "POST"});

    response = await fetch(`${this.apiUrl}/api/competition/${competitionId}`);
    responseGetCompetition = (await response.json()).responseGetCompetition;

    const competition = {
      id: responseGetCompetition.competition.id,
      name: responseGetCompetition.competition.name,
      day: Number(responseGetCompetition.competition.day),
      status : Number(responseGetCompetition.competition.status),
      format: Number(responseGetCompetition.competition.format),
      logo: responseGetCompetition.competition.logo,
      boardId: responseGetCompetition.competition.boardId,
      leagueId: "94f0d3aa-e9ba-11ee-a745-02000090a64f",
    }

    await this.updateSchedules(competition, competition.day);
    await dataService.updateCompetition({id:competition.id},competition,{upsert:true});
  }

  async checkRetiredPlayers(){
    const retiredPlayers = await dataService.getRetiredPlayers({drafted:false,active:true});

    const teamIds = [...new Set(retiredPlayers.map(x => x.teamId))];

    for(const teamId of teamIds){
      try{

        const player = retiredPlayers.find(x => x.teamId === teamId);

        let response  = await fetch(`${this.apiUrl}/api/player/${player.id}`);
        if (!response.ok) continue;
        const responseGetPlayer = (await response.json()).responseGetPlayer;

        if (responseGetPlayer.player.missNextGame === "1") continue;

        response = await fetch(`${this.apiUrl}/api/competition/team/${teamId}`);
        const responseGetTeamCompetitions = (await response.json()).responseGetTeamCompetitions;
        //team is not in a comp, between seasons.
        if (!responseGetTeamCompetitions.competitions.competition) return;

        const competitionId = responseGetTeamCompetitions.competitions.competition.id;

        const cookie = await adminBB3Service.setTeamToAdmin(null, competitionId, teamId);
        await adminBB3Service.applyMng(cookie, retiredPlayers.filter(x => x.teamId === teamId));
        
      } catch (e) {
        console.dir(e);
      }
    }
  }

  async retirePlayer(user, teamId, playerId){
    const competition = await dataService.getCompetition({"standings.teamId":teamId});
    const standing = competition.standings.find(x => x.teamId === teamId);

    if (standing.id !== user.bb3id) return false;

    const team = await dataService.getTeam({id: teamId});

    const player = team.roster.find(x => x.player.id === playerId);

    if (!player) return false;

    if (!team.allowRetire.some(x => x === playerId)) return false;

    if (!Array.isArray(player.player.casualties) && !player.player.casualties.casualtiesItem) return false;

    if (!Array.isArray(player.player.casualties.casualtiesItem)) player.player.casualties.casualtiesItem = [player.player.casualties.casualtiesItem];
    
    if (!player.player.casualties.casualtiesItem.some(x => Number(x) >= 5 )) return false;

    const retiredPlayer = player.player;
    retiredPlayer.teamId =  teamId;


    retiredPlayer.drafted = false;
    retiredPlayer.active = true;
    await dataService.updateRetiredPlayer({id: retiredPlayer.id}, retiredPlayer,{upsert:true});

    return true;
  
  }

  async handleRetiredPlayers(competitionId, teamId){
    
    const players = await dataService.getRetiredPlayers({teamId:teamId, drafted:false,active:true});

    if (players.length === 0) return;
    
    const cookie = await adminBB3Service.setTeamToAdmin(null, competitionId, teamId);
    await adminBB3Service.applyMng(cookie, players);

  }

  async inviteTeam(competitionId, coachId, teamId){
    return await fetch(`${this.apiUrl}/api/competition/${competitionId}/ticket/${coachId}/${teamId}`,{method:"POST"});
  }

  async #downloadReplay(schedule){
    const match = await dataService.getMatch({gameId:schedule.gameId});
    if (!match) return;
    
    let response = await fetch(`${this.apiUrl}/api/cabaltv/${match.gameId}/download`); 
    if (!response.ok){
      loggingService.information(`Failed to download gameId: ${match.gameId}`);
      return;
    }

    const data = await response.json();
    if (data.responseDownloadReplay.exception?.desc) {
      loggingService.information(`Failed to download gameId: ${match.gameId}\r\n${data.responseDownloadReplay.exception.desc}`);
      return;
    }
    
    if (data.responseDownloadReplay.replayData === "") {
      loggingService.information(`Failed to download gameId: ${match.gameId}\r\nBody is empty`);
      return;
    };

    await fs.writeFile(`./replays/bb3/${match.gameId}.bbr`, data.responseDownloadReplay.replayData);
    await dataService.updateMatch({matchId:schedule.matchId},{$set:{replayFile:`${match.gameId}.bbr`}});

    response = await fetch(`${this.apiUrl}/api/statistics/dice/${match.gameId}`); 
    if(!response.ok) return;
    const responseGetMatchDiceRolls = (await response.json()).responseGetMatchDiceRolls;

    if (!responseGetMatchDiceRolls) return;

    responseGetMatchDiceRolls.matchDiceRolls.matchId = match.matchId;
    responseGetMatchDiceRolls.matchDiceRolls.gameId = match.gameId;
    
    await dataService.updateDice({matchId:match.matchId,gameId:match.gameId},responseGetMatchDiceRolls.matchDiceRolls,{upsert:true});
  }

  async #validateMatch(match, user){
    if (!match.validatedBy) {
      match.validatedBy = [user.bb3id];
      await dataService.updateMatch({matchId:match.matchId},{$set:{validatedBy:match.validatedBy}});
    } else if (match.validatedBy.indexOf(user.bb3id) === -1) {
      match.validatedBy.push(user.bb3id);
      await dataService.updateMatch({matchId:match.matchId},{$set:{validatedBy:match.validatedBy}});
    }
  }

  async #invalidateMatch(match, user){
    if (!match.notValidatedBy) {
      match.notValidatedBy = [user.bb3id];
      await dataService.updateMatch({matchId:match.matchId},{$set:{notValidatedBy:match.notValidatedBy}});
    } else if (match.notValidatedBy.indexOf(user.bb3id) === -1) {
      match.notValidatedBy.push(user.bb3id);
      await dataService.updateMatch({matchId:match.matchId},{$set:{notValidatedBy:match.notValidatedBy}});
    }
  }

  async #validateSchedule(schedule, user){
    if (!schedule.validatedBy) {
      schedule.validatedBy = [user.bb3id];
      await dataService.updateSchedule({gameId:schedule.gameId},{$set:{validatedBy:schedule.validatedBy}});
    } else if (schedule.validatedBy.indexOf(user.bb3id) === -1) {
      schedule.validatedBy.push(user.bb3id);
      await dataService.updateSchedule({gameId:schedule.gameId},{$set:{validatedBy:schedule.validatedBy}});
    }
  }

  async #invalidateSchedule(schedule, user){
    if (!schedule.notValidatedBy) {
      schedule.notValidatedBy = [user.bb3id];
      await dataService.updateSchedule({gameId:schedule.gameId},{$set:{notValidatedBy:schedule.notValidatedBy}});
    } else if (schedule.notValidatedBy.indexOf(user.bb3id) === -1) {
      schedule.notValidatedBy.push(user.bb3id);
      await dataService.updateSchedule({gameId:schedule.gameId},{$set:{notValidatedBy:schedule.notValidatedBy}});
    }
  }


  #getCyanideLogo = logo => logo.replace("Neutral", "Neutre").replace("ChaosChosen", "Chaos");

  async #unplayedMatch(match){
    const parseCoach = async (coach) => {
      if(coach.name){
        coach.name = coach.name + '';
        const c = await accountService.searchAccount({"bb3id": coach.id});
        coach = Object.assign(coach, c);
      } else{
        coach.name="DO NOT PLAY THE AI";
        coach.reddit="AI";
        coach.id=0;
      }
    };

    let home = match.home;
    let away = match.away;

    await parseCoach(home.coach);
    await parseCoach(away.coach);


    return match;
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

  #parseRoster = (roster) => roster?.map(this.#mapPlayer.bind(this));

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

  #getRace(raceId){
    switch (raceId){
      case 1: return "Human";
      case 2: return "Dwarf";
      case 3: return "Skaven";
      case 4: return "Orc";
      case 5: return "Lizardman";
      case 6: return "Goblin";
      case 7: return "Wood Elf";
      case 8: return "Chaos Chosen";
      case 9: return "Dark Elf";
      case 10: return "Shambling Undead";
      case 11: return "Halfling";
      case 12: return "Amazon";
      case 14: return "Elven Union";
      case 15: return "Norse";
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
  
  #groupBy(xs, key) {
    return xs.reduce(function(rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  }
}

module.exports = new BB3Service();
