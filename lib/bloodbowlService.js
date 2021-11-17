"use strict";

const dataService = require('./DataService.js').rebbl;

class BloodBowlService{
  constructor(){
    this.allSkills = [];
    this.skillDescriptions = [];
    this.playerTypes = [];
  }

  async getRace(raceId){
    return await dataService.getRace({"id":raceId});
  }

  async getRerollCost(raceId){
    const race = await this.getRace(raceId);
    return race.reroll;
  }

  async getLonerCost(raceId){
    const race = await this.getRace(raceId);
    return race.loner;
  }

  async getSkills(pos){
    if (this.allSkills.length ===0 ){
      this.allSkills = await dataService.getSkills({});
    }
    return this.allSkills[pos]; 
  }
  async getAllSkills(){
    if (this.allSkills.length ===0 ){
      this.allSkills = await dataService.getSkills({});
    }
    return this.allSkills; 
  }

  async getSkillDescriptions(){
    if (this.skillDescriptions.length ===0 ){
      this.skillDescriptions = await dataService.getSkillDescriptions({});
    }
    return this.skillDescriptions; 
  }

  async getPlayerType(type){
    if (this.playerTypes.length === 0){
      this.playerTypes = await dataService.getPlayerTypes({});
    }
    return this.playerTypes.find(x => x.type === type);
  }

}

module.exports = new BloodBowlService();