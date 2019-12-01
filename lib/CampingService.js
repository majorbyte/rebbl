"use strict";

const bloodBowlService = require("./bloodbowlService.js")
  , cyanideService = require("./CyanideService.js")
  , dataService = require("./DataService.js").cripple
  , rebblService = require("./DataService.js").rebbl
  , loggingService = require("./loggingService.js")
  , cache = require("memory-cache");

/*
    Eurotrasher - Beat a GMAN team
    All-American Hero - Beat an REL team
    Down Under My Boot - Beat a Big O team
    The Hard Yards - Play 10 matches at REBBL Winter Camp
    New Sheriff In Town - Beat any Division 1 team from Season 12
    Flat Track Bully - Beat any Division 5 team from Season 12
    I Miss The Devastational - Kill five opposition players at Winter Camp
    #Collusion - Score fifteen touchdowns at REBBL Winter Camp
    Hell of a Drug - Beat any team featuring an Agility 5 player
    Clawgeous - Beat any team featuring at least three Claw players
    NEW! You're Not Famous Anymore! - Beat any team featuring either a legendary player (Level 7) or a player that exists as a card in REBBL: Imperium
    NEW! Referee's a Scrooge - Avoid defeat in a match in which you have three or more players sent off by the referee.
*/


  class CampingService{
    constructor(){
      this.races = [];
    }

    async getBadges(){
      return await dataService.getStandings({"competition":"REBBL Winter Camp"});
    }

    async updateBadges(){
      if(this.races.length === 0) this.races = await rebblService.getRaces();

      let matches = await dataService.getMatches({"match.competitionname":/^REBBL Winter Camp$|^WC500/});
      let coaches = [];

      for(let match of matches){
        if (match.match.competitionname !== "REBBL Winter Camp"){
          match.match.competitionname = "REBBL Winter Camp";
          dataService.updateMatch({uuid:match.uuid},{$set:{"match.competitionname":"REBBL Winter Camp"}});
        }


        await this._processBadges(coaches, match.match);
      };

      coaches.map(r =>{
        dataService.updateStanding({"competition":r.competition, id:r.id},r,{upsert:true});
      });
    }

    async _processBadges(coaches, match){
      let homeCoach = await this._getCoach(coaches,0,"REBBL Off Season","REBBL Winter Camp","season 1",match);
      let awayCoach = await this._getCoach(coaches,1,"REBBL Off Season","REBBL Winter Camp","season 1",match);

      homeCoach.badges.theHardYards++;
      awayCoach.badges.theHardYards++;

      homeCoach.badges.iMissTheDevastational += match.teams[1].sustaineddead;
      awayCoach.badges.iMissTheDevastational += match.teams[0].sustaineddead;

      homeCoach.badges.collusion = homeCoach.badges.collusion + match.teams[0].inflictedtouchdowns;
      awayCoach.badges.collusion = awayCoach.badges.collusion + match.teams[1].inflictedtouchdowns;



      if (match.teams[0].score === match.teams[1].score) {
        homeCoach.badges.refereeAScrooge = homeCoach.badges.refereeAScrooge || match.teams[0].sustainedexpulsions >= 3;
        awayCoach.badges.refereeAScrooge = awayCoach.badges.refereeAScrooge || match.teams[1].sustainedexpulsions >= 3;
        return;
      };

      if (match.teams[0].score >= match.teams[1].score){
        homeCoach.badges.eurotrasher = homeCoach.badges.eurotrasher || awayCoach.mainLeague === "REBBL - GMan";
        homeCoach.badges.allAmericanHero = homeCoach.badges.allAmericanHero || awayCoach.mainLeague === "REBBL - REL";
        homeCoach.badges.downUnderMyBoot = homeCoach.badges.downUnderMyBoot || awayCoach.mainLeague === "REBBL - Big O";
        homeCoach.badges.newSheriffInTown = homeCoach.badges.newSheriffInTown || awayCoach.mainCompetition === "Season 12 - Division 1";
        homeCoach.badges.flatTrackBully = homeCoach.badges.flatTrackBully || awayCoach.mainCompetition.indexOf("5") > -1;
        homeCoach.badges.hellOfADrug = homeCoach.badges.hellOfADrug || match.teams[1].roster.filter(x => x.attributes.ag === 5).length > 0;
        homeCoach.badges.Clawgeous = homeCoach.badges.Clawgeous || match.teams[1].roster.filter(x => x.skills.includes("Claw")).length > 2;
        homeCoach.badges.youreNotFamousAnymore = homeCoach.badges.youreNotFamousAnymore || match.teams[1].roster.filter(x => x.level >= 7).length > 0;
        homeCoach.badges.refereeAScrooge = homeCoach.badges.refereeAScrooge || match.teams[0].sustainedexpulsions >= 3;
      } else {
        awayCoach.badges.eurotrasher = awayCoach.badges.eurotrasher || homeCoach.mainLeague === "REBBL - GMan";
        awayCoach.badges.allAmericanHero = awayCoach.badges.allAmericanHero || homeCoach.mainLeague === "REBBL - REL";
        awayCoach.badges.downUnderMyBoot = awayCoach.badges.downUnderMyBoot || homeCoach.mainLeague === "REBBL - Big O";
        awayCoach.badges.newSheriffInTown = awayCoach.badges.newSheriffInTown || homeCoach.mainCompetition === "Season 12 - Division 1";
        awayCoach.badges.flatTrackBully = awayCoach.badges.flatTrackBully || homeCoach.mainCompetition.indexOf("5") > -1;
        awayCoach.badges.hellOfADrug = awayCoach.badges.hellOfADrug || match.teams[0].roster.filter(x => x.attributes.ag >= 5).length > 0;
        awayCoach.badges.Clawgeous = awayCoach.badges.Clawgeous || match.teams[0].roster.filter(x => x.skills.includes("Claw")).length > 2;
        awayCoach.badges.youreNotFamousAnymore = awayCoach.badges.youreNotFamousAnymore || match.teams[0].roster.filter(x => x.level >= 7).length > 0;
        awayCoach.badges.refereeAScrooge = awayCoach.badges.refereeAScrooge || match.teams[1].sustainedexpulsions >= 3;
      }
}

    async _getCoach(coaches, index, league, competition, season, match){
      let coach = coaches.find(function (c) {
        return c.id === match.coaches[index].idcoach && c.competition == competition
      });
  
      if (!coach) {
        coach = await this._newCoach(league,competition,season,match.coaches[index],match.teams[index]); 
        coaches.push(coach);
      }
  
      return coach;
    }

    async _newCoach(league, comp, season, coach,team){

      const race = this.races.find(x => x.id === team.idraces);
  
      const coachData = await this._getCoachLeagueCompetition(coach.idcoach,"season 12");

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
            refereeAScrooge:false
          }

      }
    }
    
    async _getCoachLeagueCompetition(coachId,season){
      let data = await rebblService.getSchedules({"opponents.0.coach.id":coachId, league:/^rebbl/i, season:season, "opponents.0.team.name":/^((?!\[admin]).)*$/i});
      if (data){
         return data[0]; 
      }else{
        console.log(`coach ${coachId} not found`);
      }
    }

    
  }


  module.exports = new CampingService();
