"use strict";

const dataService = require("./DataService.js").rebbl;

/*
    Eurotrasher - Beat a GMAN team
    All-American Hero - Beat an REL team
    Down Under My Boot - Beat a Big O team
    The Hard Yards - Play 10 matches at REBBL Summer Camp
    New Sheriff In Town - Beat any Division 1 team from Season 14
    Flat Track Bully - Beat any Division 5 team from Season 14
    I Miss The Devastational - Kill five opposition players at Summer/Summer Camp
    #Collusion - Score fifteen touchdowns at REBBL Summer Camp
    Hell of a Drug - Beat any team featuring an Agility 5 player
    Clawgeous - Beat any team featuring at least three Claw players
    You're Not Famous Anymore! - Beat any team featuring either a legendary player (Level 7) or a player that exists as a card in REBBL: Imperium
    Referee's a Scrooge - Avoid defeat in a match in which you have three or more players sent off by the referee.
    Channel Surfing - crowd surf ten opposition players at REBBL Summer Camp
    Pain to Win - inflict twenty-five casualties at REBBL Summer Camp
    Style Guide - win a match by three or more touchdowns at REBBL Summer Camp
*/


  class CampingService{
    constructor(){
      this.races = [];
    }

    async getBadges(){
      return await dataService.getStandings({"competition":"REBBL Winter Camp"});
    }

    async updateBadges(){
      if(this.races.length === 0) this.races = await dataService.getRaces();

      let matches = await dataService.getMatches({"match.competitionname":/^REBBL Winter Camp$|^SC500/,"match.started":{$gt:"2020-01-01"}});
      let coaches = [];

      for(let match of matches){
        if (match.match.competitionname !== "REBBL Winter Camp"){
          match.match.competitionname = "REBBL Winter Camp";
          dataService.updateMatch({uuid:match.uuid},{$set:{"match.competitionname":"REBBL Winter Camp"}});
        }


        await this._processBadges(coaches, match.match);
      }

      coaches.map(r =>{
        dataService.updateStanding({"competition":r.competition, id:r.id},r,{upsert:true});
      });
    }

    async _processBadges(coaches, match){
      let homeCoach = await this._getCoach(coaches,0,"REBBL Off Season","REBBL Winter Camp","season 2",match);
      let awayCoach = await this._getCoach(coaches,1,"REBBL Off Season","REBBL Winter Camp","season 2",match);

      homeCoach.badges.theHardYards++;
      awayCoach.badges.theHardYards++;

      homeCoach.badges.iMissTheDevastational += match.teams[1].sustaineddead;
      awayCoach.badges.iMissTheDevastational += match.teams[0].sustaineddead;

      homeCoach.badges.collusion = homeCoach.badges.collusion + match.teams[0].inflictedtouchdowns;
      awayCoach.badges.collusion = awayCoach.badges.collusion + match.teams[1].inflictedtouchdowns;

      homeCoach.badges.channelSurfing = homeCoach.badges.channelSurfing + match.teams[0].inflictedpushouts; 
      awayCoach.badges.channelSurfing = awayCoach.badges.channelSurfing + match.teams[1].inflictedpushouts; 

      homeCoach.badges.painToWin = homeCoach.badges.painToWin + match.teams[0].inflictedcasualties; 
      awayCoach.badges.painToWin = awayCoach.badges.painToWin + match.teams[1].inflictedcasualties; 

      if (match.teams[0].score === match.teams[1].score) {
        homeCoach.badges.refereeAScrooge = homeCoach.badges.refereeAScrooge || match.teams[0].sustainedexpulsions >= 3;
        awayCoach.badges.refereeAScrooge = awayCoach.badges.refereeAScrooge || match.teams[1].sustainedexpulsions >= 3;
        return;
      }

      if (match.teams[0].score >= match.teams[1].score){
        homeCoach.badges.eurotrasher = homeCoach.badges.eurotrasher || /rebbl - gman/i.test(awayCoach.mainLeague);
        homeCoach.badges.allAmericanHero = homeCoach.badges.allAmericanHero || /rebbl - rel/i.test(awayCoach.mainLeague);
        homeCoach.badges.downUnderMyBoot = homeCoach.badges.downUnderMyBoot || /rebbl - big o/i.test(awayCoach.mainLeague);
        homeCoach.badges.newSheriffInTown = homeCoach.badges.newSheriffInTown || (/Season 15.*Division 1/i.test(awayCoach.mainCompetition) || /Season 15 Big O Div 1/i.test(awayCoach.mainCompetition));
        homeCoach.badges.flatTrackBully = homeCoach.badges.flatTrackBully || awayCoach.mainCompetition.indexOf("5") > -1 || /rebbrl/i.test(awayCoach.mainLeague);
        homeCoach.badges.hellOfADrug = homeCoach.badges.hellOfADrug || match.teams[1].roster.filter(x => x.attributes.ag === 5).length > 0;
        homeCoach.badges.Clawgeous = homeCoach.badges.Clawgeous || match.teams[1].roster.filter(x => x.skills.includes("Claw")).length > 2;
        homeCoach.badges.youreNotFamousAnymore = homeCoach.badges.youreNotFamousAnymore || match.teams[1].roster.filter(x => x.level >= 7).length > 0;
        homeCoach.badges.refereeAScrooge = homeCoach.badges.refereeAScrooge || match.teams[0].sustainedexpulsions >= 3;
        homeCoach.badges.styleGuide = homeCoach.badges.styleGuide || match.teams[0].inflictedtouchdowns - match.teams[1].inflictedtouchdowns >= 3;
      } else {
        awayCoach.badges.eurotrasher = awayCoach.badges.eurotrasher || /rebbl - gman/i.test(homeCoach.mainLeague);
        awayCoach.badges.allAmericanHero = awayCoach.badges.allAmericanHero || /rebbl - rel/i.test(homeCoach.mainLeague);
        awayCoach.badges.downUnderMyBoot = awayCoach.badges.downUnderMyBoot || /rebbl - big o/i.test(homeCoach.mainLeague);
        awayCoach.badges.newSheriffInTown = awayCoach.badges.newSheriffInTown || (/Season 15.*Division 1/i.test(homeCoach.mainCompetition) || /Season 15 Big O Div 1/i.test(homeCoach.mainCompetition));
        awayCoach.badges.flatTrackBully = awayCoach.badges.flatTrackBully || homeCoach.mainCompetition.indexOf("5") > -1 || /rebbrl/i.test(homeCoach.mainLeague);
        awayCoach.badges.hellOfADrug = awayCoach.badges.hellOfADrug || match.teams[0].roster.filter(x => x.attributes.ag >= 5).length > 0;
        awayCoach.badges.Clawgeous = awayCoach.badges.Clawgeous || match.teams[0].roster.filter(x => x.skills.includes("Claw")).length > 2;
        awayCoach.badges.youreNotFamousAnymore = awayCoach.badges.youreNotFamousAnymore || match.teams[0].roster.filter(x => x.level >= 7).length > 0;
        awayCoach.badges.refereeAScrooge = awayCoach.badges.refereeAScrooge || match.teams[1].sustainedexpulsions >= 3;
        awayCoach.badges.styleGuide = awayCoach.badges.styleGuide || match.teams[1].inflictedtouchdowns - match.teams[0].inflictedtouchdowns >= 3;
      }
}

    async _getCoach(coaches, index, league, competition, season, match){
      let coach = coaches.find(function (c) {
        return c.id === match.coaches[index].idcoach && c.competition === competition;
      });
  
      if (!coach) {
        coach = await this._newCoach(league,competition,season,match.coaches[index],match.teams[index]); 
        coaches.push(coach);
      }
  
      return coach;
    }

    async _newCoach(league, comp, season, coach, team){

      const race = this.races.find(x => x.id === team.idraces);
  
      let coachData = await this._getCoachLeagueCompetition(/^rebbl/i,coach.idcoach,/season 15/i);
      if (!coachData)
        coachData = await this._getCoachLeagueCompetition(/^rebbrl minors/i,coach.idcoach,/season 11/i);
      

      return {
          id: coach.idcoach,
          name: coach.coachname,
          league: league,
          competition: comp,
          season: season,
          race: race.name,
          mainCompetition:coachData.competition,
          mainLeague:coachData.league,
          badges:{
            eurotrasher:false,
            allAmericanHero:false,
            downUnderMyBoot:false,
            theHardYards:0,
            newSheriffInTown:false,
            flatTrackBully:false,
            iMissTheDevastational:0,
            collusion:0,
            hellOfADrug:false,
            Clawgeous:false,
            youreNotFamousAnymore:false,
            refereeAScrooge:false,
            channelSurfing:0,
            painToWin:0,
            styleGuide:false
          }

      };
    }
    
    async _getCoachLeagueCompetition(league,coachId,season){
      
      let data = await dataService.getSchedules({"opponents.0.coach.id":coachId, league:league, season:season, "opponents.0.team.name":/^((?!\[admin]).)*$/i});
      if (data){
         return data[0]; 
      }else{
        console.log(`coach ${coachId} not found`);
      }
    }

    
  }


  module.exports = new CampingService();
