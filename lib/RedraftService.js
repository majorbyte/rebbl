"use strict";

const bb3Service = require("./bb3Service.js");
const dataService = require("./DataServiceBB3.js").rebbl3;


class RedraftService{
  constructor(){}


  async startRedraft(teamId, user){
    // change this to proper call
    const team = await dataService.getTeam({id:teamId});
    const competition = await dataService.getCompetition({"standings.teamId":teamId});
    const standing = competition.standings.find(x => x.teamId === teamId);

    if (standing.id !== user.bb3id) return {error: "you are not the coach of this team."};
    
    if (team.redraft) return {error:"The team has already started the redraft process."};

    if (team.hasPlayerThatMustLevelUp == "1") return {error: "The team has player(s) that need to have their level up fixed first."};
    if (team.mustRollExpensiveMistake == "1") return {error: "The team needs to resolve Expansive Mistakes first."};
    if (team.hasRecrutableJourneymen == "1") return {error: "The team needs to resolve Recruitable Journeyman first."};

    team.budget = await this.#calculateFunds(teamId, team.treasury);

    team.roster = team.roster.map(x => x.player);

    for(const player of team.roster) player.value = Number(player.value) + 20_000; // to do next season, it's 20k per season played

    delete team.matches;
    delete team.primaryColor;
    delete team.secondaryColor;
    delete team.tertiaryColor;
    delete team.jerseyPattern;
    team.roster.forEach(player => {
      delete player.equipmentIds;
    });

    await dataService.updateTeam({id:teamId},{$set:{redraft : team}});
  }

  clearMng(){

  }

  async #calculateFunds(teamId, treasury){
    let budget = 1_000_000;

    const competition = await dataService.getCompetition({"standings.teamId":teamId});
    const standing = competition.standings.find(x => x.teamId === teamId);

    budget += standing.games * 20_000; // 20k for playing a game.
    budget += standing.win   * 20_000; // 20k for winning a game.
    budget += standing.draw  * 10_000; // 10k for drawing a game.
  
    budget += Number(treasury);
  
    return budget;
  }
}

module.exports = new RedraftService();