"use strict";

const adminBB3Service = require("./adminBB3Service.js");
const diceService = require("./diceService.js");
const dataService = require("./DataServiceBB3.js").rebbl3;

class RedraftService{
  constructor(){
    this.competitionId = '9c419d94-0ddb-11ef-895c-bc24112ec32e';
    this.apiUrl = process.env["BB3Url"];

  }


  async checkRedraft(teamId, user){
    const team = await dataService.getTeam({id:teamId});

    //if (team.coach.id !== user.bb3id) throw {error: "you are not the coach of this team."};

    team.budget = await this.#calculateFunds(teamId, team.treasury);

    delete team.matches;
    delete team.primaryColor;
    delete team.secondaryColor;
    delete team.tertiaryColor;
    delete team.jerseyPattern;
    delete team.roster;

    team.improvements.forEach(x => {
      x.quantity = Number(x.quantity);
      x.min = Number(x.min);
      x.max = Number(x.max);
      x.improvement = Number(x.improvement);
      x.cost = Number(x.cost);
    });

    return team;
  }

  async startRedraft(teamId, user){
    // change this to proper call
    const team = await dataService.getTeam({id:teamId});

    if (team.coach.id !== user.bb3id) return {error: "you are not the coach of this team."};
    
    if (team.redraft) return {error:"The team has already started the redraft process."};

    if (team.hasPlayerThatMustLevelUp == "1") return {error: "The team has player(s) that need to have their level up fixed first."};
    //if (team.mustRollExpensiveMistake == "1") return {error: "The team needs to resolve Expansive Mistakes first."};
    if (team.hasRecrutableJourneymen == "1") return {error: "The team needs to resolve Recruitable Journeyman first."};

    team.budget = await this.#calculateFunds(teamId, team.treasury);

    team.roster = team.roster.map(x => x.player);

    for(const player of team.roster) player.cost = Number(player.value) + 20_000; // to do next season, it's 20k per season played

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

    team.improvements.forEach(x => {
      x.quantity = Number(x.quantity);
      x.min = Number(x.min);
      x.max = Number(x.max);
      x.improvement = Number(x.improvement);
      x.cost = Number(x.cost);
    });

    team.retiredPlayers = await dataService.getRetiredPlayers({teamId});
    const positions = await dataService.getPositions();
    const races = await dataService.getRaces();
    const race = races.find(x => x.code == team.race);

    team.allowedPositions = positions.filter(x => x.race === race.prefix);
    team.status = "inProgress";

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
    const apo = Number(redraft.improvements.find(i => i.improvement == 1 && i.max > 0)?.quantity || 0);
    if (retiredPlayer !== null) {
      await this.#healRetiredPlayer(player, apo);
      if (apo > 0) await dataService.updateTeam({id:teamId},{$set:{"redraft.improvements.$[x].locked":true }},{arrayFilters:[{ "x.improvement":1 }]});
    }
    else if (player.casualties.length > 0) {
      await this.#healNiggledPlayer(player, apo);
      if (apo > 0 && player.locked) await dataService.updateTeam({id:teamId},{$set:{"redraft.improvements.$[x].locked":true }},{arrayFilters:[{ "x.improvement":1 }]});
    }
  
    player.selected = true;
    await dataService.updateTeam({id:teamId},{$set:{"redraft.roster.$[x]":player }},{arrayFilters:[{ "x.id":player.id }]});
    return player;

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

  async updateImprovement(teamId, newImprovement, user){
    const team = await dataService.getTeam({id:teamId});

    if (team.coach.id !== user.bb3id) return {error: "you are not the coach of this team."};
    const redraft = team.redraft;

    const improvement = redraft.improvements.find(x => x.improvement == newImprovement.improvement);

    if (improvement.max === 0) return improvement; // not allowed to get this improvement
    if (improvement.improvement === 5) return improvement; // not allowed to change dedicated fans
    if (improvement.locked) return improvement; // not allowed to change, used for at least 1 heal

    improvement.quantity = newImprovement.quantity;

    await dataService.updateTeam({id:teamId},{$set:{"redraft.improvements.$[x]":improvement }},{arrayFilters:[{ "x.improvement":improvement.improvement }]});
    return improvement;
  }

  async updatePosition(teamId, position, user){
    const team = await dataService.getTeam({id:teamId});

    if (team.coach.id !== user.bb3id) return {error: "you are not the coach of this team."};

    await dataService.updateTeam({id:teamId},{$set:{"redraft.allowedPositions.$[x].quantity":position.quantity }},{arrayFilters:[{ "x.id":position.id }]});
  }

  async confirmDraft(teamId, user){
    const team = await dataService.getTeam({id:teamId});

    if (team.coach.id !== user.bb3id) return {error: "you are not the coach of this team."};

    this.#validateDraft(team.redraft);

    // check the team is in the correct competition
    let response = await axios.get(`${this.apiUrl}/api/competition/team/${teamId}`);

    if (response.data.responseGetTeamCompetitions.competitions.competition.id !== this.competitionId) throw {error: "The team is not part of the ReBBL Redraft competition, please join this competition ingame."};

    const cookie = await adminBB3Service.setTeamToAdmin(null, this.competitionId, team.id);

    if (team.redraft.roster.some(player => player.missNextGame == "1")){
      await adminBB3Service.clearMng(cookie, team.redraft.roster.filter(player => player.missNextGame == "1"));
    }

    for(const improvement of team.redraft.improvements){
      switch(improvement.improvement){
        case 1: // apo
          await adminBB3Service.setApothecary(cookie, improvement.quantity); 
          break;
        case 2: // cheerleader
          await adminBB3Service.setCheerleaders(cookie, improvement.quantity); 
          break;
        case 3: // assistant
          await adminBB3Service.setAssistantCoaches(cookie, improvement.quantity); 
          break;
        case 4: //reroll
          await adminBB3Service.setRerolls(cookie, improvement.quantity); 
          break;
        case 5: //dedicated fans
          await adminBB3Service.setDedicatedFans(cookie, improvement.quantity); 
          break;
        }
    }

    //fix casualties
    for(const player of roster.filter(x => x.selected && x.casualties.any(cas => cas.dice > 0)))
    for(const cas of player.casualties.filter(c => c.old !== c.new)){
      await adminBB3Service.removeInjury(cookie, player.id, c.old);
      await adminBB3Service.setInjuryInjury(cookie, player.id, c.new);
    }

    const requiredCash = team.redraft.allowedPositions.reduce((p,c) => p + c.quantity * c.cost ,0);
    await adminBB3Service.awardCash(cookie, requiredCash);


    await dataService.updateTeam({id:teamId},{$set:{"team.redraft.status": "confirmed"}});
  }

  #validateDraft(redraft){

    const playerCount = redraft.roster.filter(p => p.selected).length + redraft.allowedPositions.reduce((p,c) => p + Numner(c.quantity) ,0);
    if (playerCount < 11) throw {error: "You need to recruit at least 11 players"};
    if (playerCount > 16) throw {error: "You can't recruit more than 16 players"};

    let cost = redraft.roster.map(x => x.selected ? Number(x.value)/1000 : 0).reduce((p,c) => p+c,0);
    cost += redraft.allowedPositions.map(x => Number(x.quantity) * Number(x.cost) / 1000).reduce((p,c) => p+c,0);
    cost += redraft.improvements.map(x => Number(x.quantity )* x.cost).reduce((p,c) => p+c,0);


    if (cost > redraft.budget.total) throw {error: "The cost of the team exceeds the redraft budget."};
    
    for(const position of redraft.allowedPositions){
      const selectedPlayerCount = redraft.roster.filter(player => player.selected && player.position == position.id).length;
      if (selectedPlayerCount =  position.quantity > position.max) throw {error: `You have recruited to many players in the position ${position.type.split('_')[1].replace(/([A-Z])/g, ' $1')}`}
    }
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
      player.locked = true;
    }
  }
}

module.exports = new RedraftService();