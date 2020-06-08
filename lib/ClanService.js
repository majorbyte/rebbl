"use strict";
const config = require("./ConfigurationService.js")
, apiService = require("./apiService.js")
, cyanideService = require("./CyanideService.js")
, dataService = require("./DataService.js").rebbl
, datingService = require("./DatingService")
, teamService = require("./teamservice.js");

class Clan {
  constructor(){
     
  }

  async getClanByUser(name) {
    return await dataService.getClan({active:true, "ledger.teams.coach.name":name});
  }

  async getClanByName(name) {
    return await dataService.getClan({active:true, name:{$regex:new RegExp(`^${name}$`,"i" )}});
  }

  async getClans() {
    return await dataService.getClans({active:true},{projection:{ledger:0,teams:0,powers:0}});
  }

  createClan(name, leader){
    const clan ={
      active: true,
      division:"",
      leader: leader,
      name : name,
      members: [leader],
      powers:[]

    };

    dataService.insertClan(clan);
  }

  setLogo(name, file){
    dataService.updateClan({name:name, active:true},{$set:{logo:file}});
  }

  async getContestData(){
    let requestCount = 0;
    let season = config.getActiveClanSeason();
    const r1 = new RegExp(/\[(.*?)]/);

    for(var x = 0; x < season.leagues.length; x++){
      let league = season.leagues[x];
      let options = {platform:"pc", league : league.name, status:"*"};
      let contests = await cyanideService.contests(options);
      requestCount++;
      if(!contests.upcoming_matches) continue;

      for(let contest of contests.upcoming_matches){

        if (!contest.opponents[0].coach.id || !contest.opponents[1].coach.id) continue;
        //House 4.15 Game 1 > [4,1,5,1]
        //House 114 Week 1 Match 1 > [1,1,4,1,1]
        let game = contest.competition.replace(/\D/g,"").split("").map(Number);
        if(game.length <3) continue;

        let s = {house:game[2], round:game[1], competition:`Division ${game[0]}`, season:"season 9"};

        switch (contest.league){
          case "ReBBL Clan - Div 1 H#1-3":
          case "ReBBL Clan - Div 1 H#4-5":
            s.competition = new RegExp("Division 1","i");
            break;
          case "ReBBL Clan - Div 2a H#1-3":
          case "ReBBL Clan - Div 2a H#4-5":
            s.competition = new RegExp("Division 2A","i");
            break;
          case "ReBBL Clan - Div 2b H#1-3":
          case "ReBBL Clan - Div 2b H#4-5":
            s.competition = new RegExp("Division 2B","i");
            break;
          case "ReBBL Clan - Div 3a H#1-3":
          case "ReBBL Clan - Div 3a H#4-5":
            s.competition = new RegExp("Division 3A","i");
            break;
          case "ReBBL Clan - Div 3b H#1-3":
          case "ReBBL Clan - Div 3b H#4-5":
            s.competition = new RegExp("Division 3B","i");
            break;
        }

        let schedule = await dataService.getSchedule(s);

        // because"competition": "Re-MNG 9 & 10", results in 910
        if (!schedule) continue;

        let c = schedule.matches.find(x => x.contest_id === contest.contest_id);
        let r2 = new RegExp(`^${schedule.home.clan}$`,"i");

        if(!c) {
          schedule.matches.push(contest);
          c= contest;
        } else if(c.status !== contest.status || c.match_id !== contest.match_id){
          c = Object.assign(c, contest);
        }

        if (contest.match_uuid !== null && !c.counted){
          c.counted = true;
          datingService.removeDate(c.contest_id);
          
          if (r1.test(contest.opponents[0].team.name)){
            let clan = r1.exec(contest.opponents[0].team.name)[1];
          
            if(contest.opponents[0].team.score > contest.opponents[1].team.score){
              //If the match home team equals schedule home team 
              if (r2.test(clan)) {
                schedule.home.score++;
              } else{
                schedule.away.score++;
              }          
            }
            else if(contest.opponents[0].team.score < contest.opponents[1].team.score){
              //If the match home team equals schedule home team 
              if (r2.test(clan)) {
                schedule.away.score++;
              } else{
                schedule.home.score++;
              }          
            }
          } else {
            let clan = r1.exec(contest.opponents[1].team.name)[1];
            
            if(contest.opponents[1].team.score > contest.opponents[0].team.score){
              //If the match away team equals schedule home team 
              if (r2.test(clan)) {
                schedule.home.score++;
              } else{
                schedule.away.score++;
              }          
            }
            else if(contest.opponents[1].team.score < contest.opponents[0].team.score){
              //If the match away team equals schedule home team 
              if (r2.test(clan)) {
                schedule.away.score++;
              } else{
                schedule.home.score++;
              }          
            }
          }
        }
        await dataService.updateScheduleAsync(s,{$set:{matches:schedule.matches,"away.score":schedule.away.score,"home.score":schedule.home.score}});
      }
    }
    console.log(`request count: ${requestCount}`);
  }

  async getMatchData(uuid){
    let season = config.getActiveClanSeason();

    let date = new Date(Date.now());
    date.setHours(date.getHours() - 48);
    date = `${date.getFullYear()}-${date.getMonth() +1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:00`;

    let newMatches =[];
    if(uuid){
      let found = await dataService.getMatches({"uuid":uuid},{"uuid":1});
      if(found.length === 0) newMatches.push(uuid);
    } else {
      let leagueParameter = [];
      season.leagues.map(league => leagueParameter.push(league.name));
      
      let matches = await cyanideService.matches({platform:"pc","id_only":1,limit:100, order:"finished", start:date, league:leagueParameter.join(",")});
  
      if (!matches) return;
  
      matches = matches.matches.map(x => x.uuid);
      let found = await dataService.getMatches({"uuid":{$in:matches}},{"uuid":1});
      found = found.map(f => f.uuid);
      newMatches = matches.filter(x => !found.includes(x));
    }

    let data = [];
    await Promise.each(newMatches, async id =>{
      let match = await cyanideService.match({match_id: id});
      if(match) data.push(match);
    });

    await Promise.each(data, async m => dataService.insertMatch(m));
    await Promise.each(data, async m => await teamService.updateTeamsAfterMatch(m));


  }

  async calculateStandings(){
    let schedules = await dataService.getSchedules({league:"clan",season:"season 9"});

    const newScore = async function(clan,division){
      let c = await dataService.getClan({name:clan, season:"season 9"});
      return {
        league:"clan",
        division:division,
        season:"season 9",
        logo:c.logo,
        clan:clan,
        clanWins:0,
        clanLosses:0,
        clanDraws:0,
        clanPoints:0,
        matchWins:0,
        matchLosses:0,
        matchDraws:0,
        tdFor:0,
        tdAgainst:0,
        tdDiff:0
      };
    };
  
    let scores = [];
    for(var x=0; x < schedules.length; x++){
      let schedule = schedules[x];
  
      let home = scores.find(x => x.clan === schedule.home.clan);
      if (!home) {
        home = await newScore(schedule.home.clan,schedule.competition);
        scores.push(home);
      } 
  
      let away = scores.find(x => x.clan === schedule.away.clan);
      if (!away) {
        away = await newScore(schedule.away.clan,schedule.competition);
        scores.push(away);
      } 
  
      if(schedule.home.score > 2){
        home.clanWins++;
        away.clanLosses++;
        home.clanPoints += 3;
      } 
      if(schedule.away.score > 2){
        away.clanWins++;
        home.clanLosses++;
        away.clanPoints += 3;
      }
      if(schedule.away.score === schedule.home.score){
        home.clanDraws++;
        away.clanDraws++;
        home.clanPoints++;
        away.clanPoints++;
      }
  
      schedule.matches.map(match =>this._parseClanMatch(match,home,away, schedule.home.clan));
    }

    const _sortStandings = function(a,b){
      if(a.division > b.division) return 1;
      if(a.division < b.division) return -1;
  
      if(a.clanPoints > b.clanPoints) return -1;
      if(a.clanPoints < b.clanPoints) return 1;
      
      if(a.matchWins - a.matchLosses > b.matchWins - b.matchLosses) return -1;
      if(a.matchWins - a.matchLosses < b.matchWins - b.matchLosses) return 1;
  
      if(a.tdDiff > b.tdDiff) return -1;
      if(a.tdDiff < b.tdDiff) return 1;
  
      let schedule = schedules.find(x => {
        if (x.home.clan === a.clan && x.away.clan === b.clan) return true;
        if (x.home.clan === b.clan && x.away.clan === a.clan) return true;
        return false;
      });
  
      if (schedule){
        if (schedule.home.clan === a && schedule.home.score > schedule.away.score) return -1;
        if (schedule.away.clan === a && schedule.away.score > schedule.home.score) return -1;
        return 1;
      }
      return 0;
    };


    scores = scores.sort(_sortStandings);
    
    await dataService.removeStandings({league:"clan",season:"season 9"});

    dataService.insertStandings(scores);
  }

  _parseClanMatch(match, home, away, homeClan){
    const isClanTeam = new RegExp(/\[(.*?)]/);
    const isHomeTeam = new RegExp(`^${homeClan}$`,"i");

    //Check if the matches home team is part of a clan.
    if (!isClanTeam.test(match.opponents[0].team.name) || !isClanTeam.test(match.opponents[1].team.name)) return;

    //grab the clan name of the match home team.
    let clanNameToMatch = isClanTeam.exec(match.opponents[0].team.name)[1];
    

    let index0 = 0, index1 = 1;
    if (/admin/i.test(clanNameToMatch)){
      //if the home team for the match is an admin team, we swap indexes.
      clanNameToMatch = isClanTeam.exec(match.opponents[1].team.name)[1];
      index0 = 1;
      index1 = 0;
    } 
    

    if(match.opponents[index0].team.score > match.opponents[index1].team.score){
      // match home team won, but, we need to check if the match home team is also this rounds home team.
      isHomeTeam.test(clanNameToMatch) ? this._updateStanding(home,away) : this._updateStanding(away,home);
    } else if(match.opponents[index0].team.score < match.opponents[index1].team.score){
      isHomeTeam.test(clanNameToMatch) ? this._updateStanding(away,home) : this._updateStanding(home,away);
    } else{
      home.matchDraws++;
      away.matchDraws++;
    }

    isHomeTeam.test(clanNameToMatch) 
      ? this._updateTouchdowns(home,away,match.opponents[index0].team.score,match.opponents[index1].team.score) 
      : this._updateTouchdowns(home,away,match.opponents[index1].team.score,match.opponents[index0].team.score);

  }

  _updateStanding(winner, looser){
    winner.matchWins++;
    looser.matchLosses++;
  }

  _updateTouchdowns(homeClan, awayClan, homeTouchdowns, awayTouchdowns){
    homeClan.tdFor += homeTouchdowns;
    homeClan.tdAgainst += awayTouchdowns;
    homeClan.tdDiff = homeClan.tdFor - homeClan.tdAgainst;

    awayClan.tdFor += awayTouchdowns;
    awayClan.tdAgainst += homeTouchdowns;
    awayClan.tdDiff = awayClan.tdFor - awayClan.tdAgainst;
  }



  async newBlood(clanName,teamId,newTeamName){
    let newTeam = await cyanideService.team({platform:"pc",name:newTeamName});
    if (!newTeam) return;
    newTeam.active = true;

    let clan = await dataService.getClan({name:clanName, active:true});
    if(!clan) return;

    let team = clan.ledger.teams.find(x => x.team.id === teamId);

    clan.teams.splice(clan.teams.findIndex(x=> x.toLowerCase() === team.team.name.toLowerCase()),1);
    clan.teams.push(newTeam.team.name);

    dataService.updateClan({name:clanName, active:true},{$push:{"ledger.teams":newTeam},$set:{teams:clan.teams}});
    
    dataService.updateClan({name:clanName, active:true, "ledger.teams.team.id":teamId},{$set:{"ledger.teams.$.active":false}});

    teamService.updateTeams(newTeam.team.id);
  }

  async newCoach(clanName,teamId,newTeamName){
    let newTeam = await cyanideService.team({platform:"pc",name:newTeamName});
    if (!newTeam) return;
    newTeam.active = true;

    let clan = await dataService.getClan({name:clanName, active:true});
    if(!clan) return;

    let team = clan.ledger.teams.find(x => x.team.id === teamId);

    clan.teams.splice(clan.teams.findIndex(x=> x.toLowerCase() === team.team.name.toLowerCase()),1);
    clan.teams.push(newTeam.team.name);


    let member = {coach: newTeam.coach.name, coachId: newTeam.coach.id, reddit:""};
    let name = new RegExp(`^${newTeam.coach.name}$`,"i");
    let account = await dataService.getAccount({coach:name});
    if(account) member.reddit = account.reddit;
    
    clan.members.splice(clan.members.findIndex(x=> x.coach.toLowerCase() === team.team.name.toLowerCase()),1);
    clan.members.push(member);

    dataService.updateClan({name:clanName, active:true},{$push:{"ledger.teams":newTeam},$set:{teams:clan.teams, members:clan.members}});
    
    dataService.updateClan({name:clanName, active:true, "ledger.teams.team.id":teamId},{$set:{"ledger.teams.$.active":false}});

    teamService.updateTeams(newTeam.team.id);
  }

  assassinate(teamId, playerId){
     dataService.updatePlayer({teamId: teamId, id:playerId},{$set:{assassinated:true}});
  }

  async getCompetitionInformation(divsion, round, house){

    let leagueName = ""; 

    switch (divsion){
      case "Division 1":
        leagueName = house <= 3 ? "ReBBL Clan - Div 1 H#1-3" : "ReBBL Clan - Div 1 H#4-5";
        break;
      case "Division 2a":
        leagueName = house <= 3 ? "ReBBL Clan - Div 2a H#1-3" : "ReBBL Clan - Div 2a H#4-5";
        break;
      case "Division 2b":
        leagueName = house <= 3 ? "ReBBL Clan - Div 2b H#1-3" : "ReBBL Clan - Div 2b H#4-5";
        break;
      case "Division 3a":
        leagueName = house <= 3 ? "ReBBL Clan - Div 3a H#1-3" : "ReBBL Clan - Div 3a H#4-5";
        break;
      case "Division 3b":
        leagueName = house <= 3 ? "ReBBL Clan - Div 3b H#1-3" : "ReBBL Clan - Div 3b H#4-5";
        break;
    }

    let competitions = await this._getCompetitionInformation(leagueName, house,round);

    for(let competition of competitions){

      const competitionInformation = await apiService.getCompetitionInfo(competition.Row.Id.Value.replace(/\D/g,""));

      competition.participants = competitionInformation.ResponseGetCompetitionData.CompetitionData.Participants.CompetitionParticipant;

      if(!competition.participants) competition.participants = [];
      if(!Array.isArray(competition.participants)) competition.participants = [competition.participants];

      const information = await apiService.getCompetitionTicketInfo(competition.Row.Id.Value.replace(/\D/g,""));

      const ticketInfos = information.ResponseGetUnusedAffectedTickets.TicketsInfos.TicketInfos;
      if(ticketInfos)
        if(Array.isArray(ticketInfos))
          competition.tickets = ticketInfos.filter(ticket => ticket.Coach.IdUser !== undefined );
        else
          competition.tickets = [ticketInfos].filter(ticket => ticket.Coach.IdUser !== undefined );
      else
        competition.tickets = [];
    }

    return competitions;
  }

  async _getCompetitionInformation(leagueName, house, round){
    const clanConfiguration = config.getActiveClanSeason();
    const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: "base"});




    const leagueConfig = clanConfiguration.leagues.find(league => collator.compare(league.name, leagueName) === 0);

    const leagueInfo = await apiService.getLeagueInfo(leagueConfig.id);
    let data = leagueInfo.ResponseGetLeagueData.LeagueData.Competitions.CompetitionSummaryData;
    if(!Array.isArray(data)) data =[data];

    let result = data.filter(summary => {
      let game = summary.Row.Name.match(/(\d[a-b]?)/gi);
      if (!game) return false;
      const r = new RegExp(game[0]);

      return r.test(leagueName) && Number(game[2]) === house && round === Number(game[1]);
    });
    return result;
  }

  async abandon(contestId){
    dataService.updateSchedule({"matches.contest_id":contestId},{"matches.$.opponents.0.team.score":0,"matches.$.opponents.1.team.score":0,"matches.$.counted":true,"matches.$.status":"played"});
  }

}
if (!Promise.each) Promise.each = async (arr, fn) => {for(const item of arr) await fn(item);};

module.exports = new Clan();