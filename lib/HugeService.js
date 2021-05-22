"use strict";

const dataService = require("./DataService.js").rebbl
  , cache = require("memory-cache")
 
class HugeService{
  constructor(){
    this.cache = cache;
    this.allSkills = [];
    this.races = [];

    this.BigGuys = ["Human_Ogre",
    "Dwarf_DeathRoller",
    "WoodElf_Treeman",
    "Skaven_RatOgre",
    "Orc_Troll",
    "Lizardman_Kroxigor",
    "Chaos_Minotaur",
    "Goblin_Troll",
    "Undead_Mummy",
    "Halfling_Treeman",
    "Norse_Yhetee",
    "Khemri_TombGuardian",
    "Nurgle_BeastOfNurgle",
    "Ogre_Ogre",
    "ChaosDwarf_Minotaur",
    "Underworld_Troll",
    "Kislev_TameBear",
    "Goblin_Fanatic"];
  }

  newScore(league, comp, season, coach,team, points, tdDiff){

    const race = this.races.find(x => x.id === team.idraces);

    return {
        id: coach.idcoach,
        name: coach.coachname,
        league: league,
        competition: comp,
        season: season,
        team: team.teamname,
        teamId: team.idteamlisting,
        race: race.name,
        points: points,
        games: 0,
        kills: 0,
        casualties:0,
        completions:0,
        touchdowns:0,
        interceptions:0,
        win: 0,
        loss: 0,
        draw: 0,
        tddiff: tdDiff,
        type:"hjmcl",
        bigGuy:null
        
    };
  } 

  async calculateStandings(season){
    let matches = await dataService.getMatches({"match.leaguename":"REBBL Off Season","match.competitionname":"HJ Memorial Ladder"});

    /*
      • 3 points for a match win
      • 1 point for a match tie
      • Total SPP on your Big Guy x Points earned
      • Any team that can enter more than one player with natural Strength 5 or higher is permitted to do so, 
        but only their single highest SPP player counts towards the multiplier
    */
    let coaches = [];

    await Promise.each(matches, async match => {
      let homeScore = match.match.teams[0].roster.reduce((p,c) => p += c.stats.inflictedtouchdowns,0);
      let awayScore = match.match.teams[1].roster.reduce((p,c) => p += c.stats.inflictedtouchdowns,0);

      let homeCoach = this._getCoach(coaches,0,league,competitions[x],season,match.match);
      let awayCoach = this._getCoach(coaches,1,league,competitions[x],season,match.match);

      if (homeScore === awayScore){
        this._processDraw(homeCoach);
        this._processDraw(awayCoach);
      }else if (homeScore > awayScore){
        this._processWin(homeCoach);
        this._processLoss(awayCoach);
        homeCoach.tddiff += homeScore-awayScore;
        awayCoach.tddiff += awayScore-homeScore;
      }else if (homeScore < awayScore){
        this._processWin(awayCoach);
        this._processLoss(homeCoach);
        awayCoach.tddiff += awayScore-homeScore;
        homeCoach.tddiff += homeScore-awayScore;
      }

    });

    await Promise.each(coaches, async coach => {
      coach.bigGuy = await this._processRoster(coach.teamId);
      if (coach.bigGuy) coach.points *=  coach.bigGuy.spp;
      else  coach.points = 0;
    });

    coaches = coaches.sort(
      function(a,b){
        //points
        if(a.points > b.points) {return -1;} 
        if (b.points > a.points) {return 1;} 
        
        return 0; 
      });
    
    for(let i=0; i<coaches.length; i++)
      coaches[i].position = i+1;

    if (coaches.length > 0){
      await dataService.removeStandings({"league": "REBBL Off Season", "competition":"HJ Memorial Ladder", "season":season});
      dataService.insertStandings(coaches);
    }  

  }

  _getCoach(coaches, index, league, competition, season, match){
    let coach = coaches.find(function (c) {
      return c.id === match.coaches[index].idcoach && c.competition === competition;
    });

    if (!coach) {
      coach = this.newScore(league,competition,season,match.coaches[index],match.teams[index],0,0); 
      coaches.push(coach);
    }

    return coach;
  }

  _processWin(coach) {
    coach.games +=1;
    //• 1 point for a match tie
    coach.points +=3;
    coach.win +=1;
  }
  _processDraw (coach) {
    coach.games +=1;
    //• 1 point for a match tie
    coach.points +=1;
    coach.draw +=1;
  }

  _processLoss (coach) {
    coach.games+=1;
    coach.loss+=1;
  }

  async _processRoster(teamId){

    const activePlayers = await dataService.getPlayers({team:teamId,active:true});

    activePlayers = activePlayers.filter(x => this.BigGuys.indexOf(x.type) > -1 );

    activePlayers = activePlayers.sort((a,b) => a.xp > b.xp ? -1 : 1);  

    if (activePlayers.length === 0) return null;

    return {
      id: activePlayers[0].id,
      spp: activePlayers[0].xp,
    }
  }

  async getStandings(){
    let standings = await dataService.getStandings({type:"hjmcl",season:"season 1"});


    return await Promise.all(standings.map(async s => {
      let team = await dataService.getTeam({"team.id":s.teamId});
      if (team){ 
        s.team = team.team;
        s.coach = team.coach;
      }
      return s; 
    }));
  }


}
if (!Promise.each) Promise.each = async (arr, fn) => {for(const item of arr) await fn(item);};

module.exports = new HugeService();