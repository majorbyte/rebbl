"use strict";

const bb3Service = require("./bb3Service.js");
const diceService = require("./diceService.js");
const dataService = require("./DataServiceBB3.js").rebbl3;


class RedraftService{
  constructor(){}


  async startRedraft(teamId, user){
    // change this to proper call
    const team = await dataService.getTeam({id:teamId});

    if (team.coach.id !== user.bb3id) return {error: "you are not the coach of this team."};
    
    if (team.redraft) return {error:"The team has already started the redraft process."};

    if (team.hasPlayerThatMustLevelUp == "1") return {error: "The team has player(s) that need to have their level up fixed first."};
    if (team.mustRollExpensiveMistake == "1") return {error: "The team needs to resolve Expansive Mistakes first."};
    //if (team.hasRecrutableJourneymen == "1") return {error: "The team needs to resolve Recruitable Journeyman first."};

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
      if (player.casualties.casualtiesItem && !Array.isArray(player.casualties.casualtiesItem)) player.casualties = [player.casualties.casualtiesItem];
      else if (!player.casualties.casualtiesItem) player.casualties = [];
      else player.casualties = player.casualties.casualtiesItem;

      player.casualties = player.casualties.map(cas => {return {old:Number(cas),new:-1,dice:-1,apo:-1 }});
    });

    await dataService.updateTeam({id:teamId},{$set:{redraft : team}});
  }

  async draftPlayer(teamId, playerId, user){
    const team = await dataService.getTeam({id:teamId});

    if (team.coach.id !== user.bb3id) return {error: "you are not the coach of this team."};
    const redraft = team.redraft;

    const player = redraft.roster.find(p => p.id == playerId);

    if (player === null) throw {error: "Player not found"};
    if (player.locked) throw {error: "Player is already healed an locked"}

    const retiredPlayer = await dataService.getRetiredPlayer({id:playerId});
    const apo = Number(redraft.improvements.find(i => i.improvement == 1)?.quantity || 0);
    if (retiredPlayer !== null) await this.#healRetiredPlayer(player, apo);
    else if (player.casualties.length > 0) await this.#healNiggledPlayer(player, apo);
  
    player.selected = true;
    await dataService.updateTeam({id:teamId},{$set:{"redraft.roster.$[x]":player }},{arrayFilters:[{ "x.id":player.id }]});

  }

  async undraftPlayer(teamId, playerId,user){
    const team = await dataService.getTeam({id:teamId});

    if (team.coach.id !== user.bb3id) return {error: "you are not the coach of this team."};
    const redraft = team.redraft;

    const player = redraft.roster.find(p => p.id == playerId);

    if (player === null) throw {error: "Player not found"};
    if (player.locked) throw {error: "Player is locked"}
  
    player.selected = false;
    await dataService.updateTeam({id:teamId},{$set:{"redraft.roster.$[x]":player }},{arrayFilters:[{ "x.id":player.id }]});

  }

  clearMng(){

  }

  async #calculateFunds(teamId, treasury){
    let budget = {base:1_000};

    const competition = await dataService.getCompetition({"standings.teamId":teamId});
    const standing = competition.standings.find(x => x.teamId === teamId);

    budget.games = standing.games * 20; // 20k for playing a game.
    budget.wins = standing.win    * 20; // 20k for winning a game.
    budget.draws = standing.draw  * 10; // 10k for drawing a game.
  
    budget.treasury = Number(treasury)/1_000;
  
    budget.total = budget.base + budget.games + budget.wins + budget.draws + budget.treasury;

    return budget;
  }

  async #healRetiredPlayer(player, apo){
    for(const casualty of player.casualties) {
      casualty.dice = await diceService.roll(6);
      casualty.apo = apo;
      casualty.new = casualty.dice + casualty.apo > 3 ? 3 : casualty.old;
    }
    player.locked = true;
  }

  async #healNiggledPlayer(player, apo){
    for(const casualty of player.casualties){
      if (casualty.old !== 3) continue;
      casualty.dice = await diceService.roll(6);
      casualty.apo = apo;

      casualty.new = casualty.dice + casualty.apo > 3 ? 0 : 3;
    }
    player.locked = true;
  }
}

module.exports = new RedraftService();