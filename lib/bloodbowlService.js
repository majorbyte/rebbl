"use strict";

const Datastore = require('./async-nedb.js');

class BloodBowlService{
  constructor(){
    this.skills = new Datastore.datastore('datastore/skills.db');
    this.races = new Datastore.datastore('datastore/races.db');

    this.skills.loadDatabase();
    this.races.loadDatabase();
  }

  async getRace(raceId){
    return await this.races.findOne({"id":raceId});
  }

  async getRerollCost(raceId){
    const race = await this.getRace(raceId);
    return race.reroll;
  }

  async getLonerCost(raceId){
    const race = await this.getRace(raceId);
    return race.loner;
  }

}

module.exports = new BloodBowlService();