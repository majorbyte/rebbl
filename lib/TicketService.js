"use strict";

const 
  apiService = require("./apiService.js")
  , cyanideService = require("./CyanideService.js")
  , dataService = require("./DataService.js").rebbl;

class TicketService{
  constructor() {
    this.races = [
      {id:13,name:"Amazon"}
      ,{id:24,name:"Bretonnian"}
      ,{id:8,name:"Chaos"}
      ,{id:21,name:"Chaos Dwarf"}
      ,{id:9,name:"Dark Elf"}
      ,{id:2,name:"Dwarf"}
      ,{id:14,name:"Elven Union"}
      ,{id:6,name:"Goblin"}
      ,{id:11,name:"Halfling"}
      ,{id:15,name:"High Elf"}
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
      ,{id:22,name:"Underworld Denizens"}
      ,{id:20,name:"Vampire"}
      ,{id:7,name:"Wood Elf"}
    ];
  }

  async checkTickets(){
    for(let id of [42290,42291,42292]){
      await this._checkLeague(id);
    }
      
  }

  async _checkLeague(leagueId){
    const league = await apiService.getLeagueInfo(leagueId);
    
    league.ResponseGetLeagueData.LeagueData.Competitions.CompetitionSummaryData.map(this._getTickets,this);
  }

  async _getTickets(competition){
    if(competition.Row.Name.startsWith("Season 14")){
      const competitionId = competition.Row.Id.Value.replace(/\D/g,"");
      let info = await apiService.getCompetitionTicketInfo(competitionId);
      let c = await apiService.getCompetitionInfo(competitionId);

      if(!Array.isArray(info.ResponseGetUnusedAffectedTickets.TicketsInfos.TicketInfos))
        info.ResponseGetUnusedAffectedTickets.TicketsInfos.TicketInfos = [info.ResponseGetUnusedAffectedTickets.TicketsInfos.TicketInfos];
      info.ResponseGetUnusedAffectedTickets.TicketsInfos.TicketInfos.map(this._processTicket,this);

      if(!Array.isArray(c.ResponseGetCompetitionData.CompetitionData.Participants.CompetitionParticipant))
        c.ResponseGetCompetitionData.CompetitionData.Participants.CompetitionParticipant = [c.ResponseGetCompetitionData.CompetitionData.Participants.CompetitionParticipant];
      c.ResponseGetCompetitionData.CompetitionData.Participants.CompetitionParticipant.map(x => 
        this._processParticipant(x, c.ResponseGetCompetitionData.CompetitionData.RowLeague.Name, c.ResponseGetCompetitionData.CompetitionData.RowCompetition.Name),this);
    }
  }

  async _processTicket(ticket){
    this._checkTeam(ticket.RowTeam);
    const coachId = Number(ticket.Coach.IdUser);
    const standing = await dataService.getStanding({id:coachId, season:"season 14"});
    if (!standing){
      let score = this._newScore(coachId, ticket.Coach.User,ticket.RowLeague.Name,ticket.RowCompetition.Name,Number(ticket.RowCompetition.Id.Value.replace(/\D/g,"")), 
        ticket.RowTeam.Name,ticket.RowTeam.ID.Value.replace(/\D/g,""),Number(ticket.RowTeam.IdRaces));
      dataService.updateStanding({id:coachId, season:"season 14"}, score,{upsert:true});
    }
  }

  async _processParticipant(participant, league, competition){
    this._checkTeam(participant.RowTeam);

    const coachId = Number(participant.IdCoach);
    let standing = await dataService.getStanding({id:coachId, season:"season 14"});
    if (!standing){
      standing = this._newScore(coachId, participant.NameCoach, league,competition,Number(participant.IdCompetition.Value.replace(/\D/g,"")), 
      participant.RowTeam.Name,participant.RowTeam.ID.Value.replace(/\D/g,""),Number(participant.RowTeam.IdRaces));
    }
    standing.acceptedTicket = true;
    dataService.updateStanding({id:coachId, season:"season 14"}, standing,{upsert:true});
  }

  async _checkTeam(team){
    const teamId = Number(team.ID.Value.replace(/\D/g,""));
    let check = await dataService.getTeam({"team.id":teamId});
    if(!check){
      check = await cyanideService.team({team:teamId});
      check.team.roster = check.roster;
      dataService.updateTeam({"team.id": teamId},check,{upsert:true});
    }
  }

  _newScore(coachId, coach, league, competition, competitionId, team, teamId, raceId){
    var race = this.races.find(x => x.id === raceId);
    return {
      "id" : coachId,
      "name" : coach,
      "league" : league,
      "competition" : competition,
      "competitionId" : competitionId,
      "season" : "season 14",
      "team" : team,
      "teamId" : teamId,
      "race" : race.name,
      "points" : 0,
      "games" : 0,
      "win" : 0,
      "loss" : 0,
      "draw" : 0,
      "tddiff" : 0,
      "strength" : 0,
      "strengthOfSchedule" : 0,
      "position" : 0,
      "acceptedTicket":false
    };
  }
}

module.exports = new TicketService();