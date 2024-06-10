"use strict";

const adminBB3Service = require("./adminBB3Service.js");
const axios = require("axios");
const diceService = require("./diceService.js");
const dataService = require("./DataServiceBB3.js").rebbl3;
const {getDateFromUUID} = require("./util.js");

class RedraftService{
  constructor(){
    this.competitionId = '9c419d94-0ddb-11ef-895c-bc24112ec32e';
    this.apiUrl = process.env["BB3Url"];
  }


  async checkRedraft(teamId, user){
    const team = await dataService.getTeam({id:teamId});

    let response = await axios.get(`${this.apiUrl}/api/competition/team/${teamId}`);

    if (!response.data.responseGetTeamCompetitions.competitions.competition) team.wrongCompetition = true;
    else team.wrongCompetition = response.data.responseGetTeamCompetitions.competitions.competition.id !== this.competitionId;

    
    team.budget = await this.#calculateFunds(teamId, team.treasury);

    response = await axios.get(`${this.apiUrl}/api/team/${teamId}`);

    team.hasPlayerThatMustLevelUp = response.data.responseGetTeam.team.hasPlayerThatMustLevelUp ;
    team.mustRollExpensiveMistake =  response.data.responseGetTeam.team.mustRollExpensiveMistake;
    team.hasRecrutableJourneymen =  response.data.responseGetTeam.team.hasRecrutableJourneymen;

    response = await axios.get(`${this.apiUrl}/api/team/${teamId}/roster`);

    team.improvements = response.data.responseGetTeamRoster.roster.improvements.teamRosterImprovementsEntry;

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
    let team = await dataService.getTeam({id:teamId});

    if (team.coach.id !== user.bb3id) throw {error: "you are not the coach of this team."};
    
    if (team.redraft) throw {error:"The team has already started the redraft process."};

    // check the team is in the correct competition
    let response = await axios.get(`${this.apiUrl}/api/competition/team/${teamId}`);

    if (!response.data.responseGetTeamCompetitions.competitions.competition) throw {error: "The team is not part of the ReBBL Redraft competition, please join this competition ingame."};
    if (response.data.responseGetTeamCompetitions.competitions.competition.id !== this.competitionId) throw {error: "The team is not part of the ReBBL Redraft competition, please join this competition ingame."};
    

    const redraft = {};

    response = await axios.get(`${this.apiUrl}/api/team/${teamId}`);

    if (response.data.responseGetTeam.team.hasPlayerThatMustLevelUp == "1") throw {error: "The team has player(s) that need to have their level up fixed first."};
    if (response.data.responseGetTeam.team.mustRollExpensiveMistake == "1") throw {error: "The team needs to resolve Expansive Mistakes first."};
    if (response.data.responseGetTeam.team.hasRecrutableJourneymen == "1") throw {error: "The team needs to resolve Recruitable Journeyman first."};

    response = await axios.get(`${this.apiUrl}/api/team/${teamId}/roster`);


    redraft.roster = response.data.responseGetTeamRoster.roster.slots.teamRosterSlot;
    redraft.improvements = response.data.responseGetTeamRoster.roster.improvements.teamRosterImprovementsEntry;

    redraft.treasury = Number(response.data.responseGetTeamRoster.roster.treasury);

    redraft.budget = await this.#calculateFunds(teamId, team.treasury);

    redraft.roster = redraft.roster.map(x => x.player);

    for(const player of redraft.roster) player.cost = Number(player.value) + 20_000; // to do next season, it's 20k per season played

    redraft.roster.forEach(player => {
      delete player.equipmentIds;
      if (player.casualties.casualtiesItem && !Array.isArray(player.casualties.casualtiesItem)) player.casualties = [player.casualties.casualtiesItem];
      else if (!player.casualties.casualtiesItem) player.casualties = [];
      else player.casualties = player.casualties.casualtiesItem;

      player.casualties = player.casualties.map(cas => {return {old:Number(cas),new:-1,dice:-1,apo:-1 }});
    });

    redraft.improvements.forEach(x => {
      x.quantity = Number(x.quantity);
      x.min = Number(x.min);
      x.max = x.quantity;
      x.improvement = Number(x.improvement);
      x.cost = Number(x.cost);
    });

    redraft.retiredPlayers = await dataService.getRetiredPlayers({teamId});
    const positions = await dataService.getPositions();
    const races = await dataService.getRaces();
    const race = races.find(x => x.code == team.race);

    redraft.allowedPositions = positions.filter(x => x.race === race.prefix);
    redraft.status = "inProgress";

    await dataService.updateTeam({id:teamId},{$set:{redraft : redraft}});
  }

  async draftPlayer(teamId, playerId, user){
    const team = await dataService.getTeam({id:teamId});

    if (team.coach.id !== user.bb3id) throw {error: "you are not the coach of this team."};
    const redraft = team.redraft;

    const player = redraft.roster.find(p => p.id == playerId);

    if (player === null) throw {error: "Player not found"};
    if (player.locked) throw {error: "Player is already healed an locked"}

    const retiredPlayer = await dataService.getRetiredPlayer({id:playerId});
    const apo = Number(redraft.improvements.find(i => i.improvement == 1 && i.max > 0)?.quantity || 0);

    if (player.casualties.length > 0) {
      await this.#healNiggledPlayer(player, apo);
      if (apo > 0 && player.locked) await dataService.updateTeam({id:teamId},{$set:{"redraft.improvements.$[x].locked":true }},{arrayFilters:[{ "x.improvement":1 }]});
    }

    if (retiredPlayer !== null) {
      await this.#healRetiredPlayer(player, apo);
      dataService.updateRetiredPlayer({id:playerId},{$set:{drafted:true}});
      if (apo > 0) await dataService.updateTeam({id:teamId},{$set:{"redraft.improvements.$[x].locked":true }},{arrayFilters:[{ "x.improvement":1 }]});
    }
  
    player.selected = true;
    await dataService.updateTeam({id:teamId},{$set:{"redraft.roster.$[x]":player }},{arrayFilters:[{ "x.id":player.id }]});
    return player;

  }

  async undraftPlayer(teamId, playerId,user){
    const team = await dataService.getTeam({id:teamId});

    if (team.coach.id !== user.bb3id) throw {error: "you are not the coach of this team."};
    const redraft = team.redraft;

    const player = redraft.roster.find(p => p.id == playerId);

    if (player === null) throw {error: "Player not found"};
    if (player.locked) throw {error: "Player is locked"}
  
    player.selected = false;
    await dataService.updateTeam({id:teamId},{$set:{"redraft.roster.$[x]":player }},{arrayFilters:[{ "x.id":player.id }]});

  }

  async updateImprovement(teamId, newImprovement, user){
    const team = await dataService.getTeam({id:teamId});

    if (team.coach.id !== user.bb3id) throw {error: "you are not the coach of this team."};
    if (team.redraft.status !== "inProgress") throw {error: "invalid state"};

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

    if (team.coach.id !== user.bb3id) throw {error: "you are not the coach of this team."};

    if (team.redraft.status !== "inProgress") throw {error: "invalid state"};

    await dataService.updateTeam({id:teamId},{$set:{"redraft.allowedPositions.$[x].quantity":position.quantity }},{arrayFilters:[{ "x.id":position.id }]});
  }

  async confirmDraft(teamId, user){
    const team = await dataService.getTeam({id:teamId});

    if (team.coach.id !== user.bb3id) throw {error: "you are not the coach of this team."};

    if (team.redraft.status !== "inProgress") throw {error: "Invalid state for confirmation."};
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
    for(const player of team.redraft.roster.filter(x => x.selected && x.casualties.some(cas => cas.dice > 0)))
    for(const cas of player.casualties.filter(c => c.old !== c.new)){
      await adminBB3Service.removeInjury(cookie, player.id, cas.old);
      if (cas.new > 0) await adminBB3Service.setInjury(cookie, player.id, cas.new);
    }
    await adminBB3Service.clearMng(cookie, team.redraft.roster.filter(x => x.selected && x.casualties.some(cas => cas.dice > 0)));

    const requiredCash = team.redraft.allowedPositions.reduce((p,c) => p + (c.quantity ||0 ) * c.cost ,0);
    await adminBB3Service.awardCash(cookie, requiredCash);


    await dataService.updateTeam({id:teamId},{$set:{"redraft.status": "confirmed", "redraft.confirmedOn": Date.now()}});
  }

  async validateDraft(teamId, user){
    const team = await dataService.getTeam({id:teamId});

    if (team.coach.id !== user.bb3id) throw {error: "you are not the coach of this team."};

    if (team.redraft.status !== "confirmed") throw {error: "Invalid state for validation confirmation."};

    const response = await axios.get(`${this.apiUrl}/api/Team/${team.id}/roster`);
  
    const errors = [];

    const roster = response.data.responseGetTeamRoster.roster.slots.teamRosterSlot;
    const improvements = response.data.responseGetTeamRoster.roster.improvements.teamRosterImprovementsEntry;
    const positions = await dataService.getPositions();

    for (const p of roster){
      if (getDateFromUUID(p.player.id) > team.redraft.confirmedOn) {
        // new rookie
        const pos = positions.find(x => x.id == p.player.position);
        const index = team.redraft.allowedPositions.findIndex(x => x.type == pos.type); // '23' vs 'thrower'
        if(!team.redraft.allowedPositions[index].quantity) team.redraft.allowedPositions[index].quantity = 0;
        team.redraft.allowedPositions[index].quantity--;
        if (p.player.level > 1) errors.push({error: `Player ${p.player.name} should be level 1, but is level ${p.player.level}`});
        if (p.player.spp > 0) errors.push({error: `Player ${p.player.name} should have 0 spp, but has ${p.player.spp} spp`});
      } else {
        //existing player
        const draftPlayer = team.redraft.roster.find(x => x.id == p.player.id);
        
        if (!draftPlayer) continue;

        if (draftPlayer.level != p.player.level) errors.push({error: `Player ${draftPlayer.name} should be level ${draftPlayer.level} but is level ${p.player.level}.`});
        if (draftPlayer.spp != p.player.spp) errors.push({error: `Player ${draftPlayer.name}'s spp does not match. Should have ${draftPlayer.spp} spp but has ${p.player.level} spp.`});

        if (!draftPlayer.selected) errors.push({error: `Player ${draftPlayer.name} must be sacked.`}); 
      }
    }

    const names = ["","Apotecary","Cheerleaders","Assistant coaches","Rerolls","Dedicated fans"];
    for (const improvement of improvements){
      const imp = team.redraft.improvements.find(x => x.improvement == improvement.improvement);

      if (imp.quantity != improvement.quantity) errors.push({error: `${names[Number(improvement.improvement)]}: Expected ${imp.quantity}, found ${improvement.quantity}.`});

    }

    for(const player of team.redraft.allowedPositions){
      if ((player.quantity || 0 ) === 0) continue;
      if ( player.quantity > 0) errors.push({error:`You need to purchase more ${player.type}, missing: ${player.quantity}`});
      if ( player.quantity < 0) errors.push({error:`You have purchased to may ${player.type}, ${Math.abs(player.quantity)} to be precise.`});
    }

    if (errors.length > 0) throw errors;

    await dataService.updateTeam({id:teamId},{$set:{"redraft.status": "validated", "redraft.validatedOn": Date.now()}});
  }

  #validateDraft(redraft){

    const playerCount = redraft.roster.filter(p => p.selected).length + redraft.allowedPositions.reduce((p,c) => p + Number(c.quantity) ,0);
    if (playerCount < 11) throw {error: "You need to recruit at least 11 players"};
    if (playerCount > 16) throw {error: "You can't recruit more than 16 players"};

    let cost = redraft.roster.map(x => x.selected ? Number(x.cost)/1000 : 0).reduce((p,c) => p+c,0);
    cost += redraft.allowedPositions.map(x => Number(x.quantity) * Number(x.cost) / 1000).reduce((p,c) => p+c,0);
    cost += redraft.improvements.map(x => Number(x.quantity )* (Number(x.cost) / (x.improvement === 4 ? 2000 : 1000)) ).reduce((p,c) => p+c,0);


    if (cost > redraft.budget.total) throw {error: "The cost of the team exceeds the redraft budget."};
    
    for(const position of redraft.allowedPositions){
      const selectedPlayerCount = redraft.roster.filter(player => player.selected && player.position == position.id).length;
      if (selectedPlayerCount  > position.max) throw {error: `You have recruited to many players in the position ${position.type.split('_')[1].replace(/([A-Z])/g, ' $1')}`}
    }
  }

  async #calculateFunds(teamId, treasury){
    let budget = {base:1_000, games:0, wins:0, draws:0};

    const competitions = await dataService.getCompetitions({"standings.teamId":teamId}); // TODO: adjust for season

    for(const competition of competitions){
      const standing = competition.standings.find(x => x.teamId === teamId);

      budget.games += (standing.games * 20); // 20k for playing a game.
      budget.wins += (standing.win    * 20); // 20k for winning a game.
      budget.draws += (standing.draw  * 10); // 10k for drawing a game.
    }
  
    budget.treasury = Number(treasury)/1_000;
  
    budget.total = budget.base + budget.games + budget.wins + budget.draws + budget.treasury;

    return budget;
  }

  async #healRetiredPlayer(player, apo){
    for(const casualty of player.casualties) {
      if (casualty.old < 5) continue;
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