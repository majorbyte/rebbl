"use strict";

const bb3Service = require("./bb3Service.js");
const dataService = require("./DataServiceBB3.js").rebbl3;


class RedraftService{
  constructor(){}


  clearMng(){

  }


  async getRedraftTeam(teamId){
    
    //await bb3Service.updateTeam(teamId);
    const team = await dataService.getTeam({id:teamId});

    team.budget = await this.#calculateFunds(teamId, team.treasury);

    team.roster = team.roster.map(x => x.player);

    for(const player of team.roster) player.value = Number(player.value) + 20_000; // to do next season, it's 20k per season played

    return team;
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