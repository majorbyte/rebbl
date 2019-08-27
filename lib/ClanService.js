"use strict";
const dataService = require('./DataService.js').rebbl;

class Clan {
  constructor(){
     
  }

  async getClanByUser(name) {
    return await dataService.getClan({active:true, "ledger.teams.coach.name":name});
  }

  async getClanByName(name) {
    return await dataService.getClan({active:true, name:{$regex:new RegExp(`^${name}$`,"i" )}});
  }

  async getClans() {
    return await dataService.getClans({},{projection:{ledger:0,teams:0,powers:0}});
  }

  createClan(name, leader){
    const clan ={
      active: true,
      division:"",
      leader: leader,
      name : name,
      members: [leader],
      powers:[]

    }

    dataService.insertClan(clan);
  }

  setLogo(name, file){
    dataService.updateClan({name:name},{$set:{logo:file}});
  }

  async addTeam(clan, team){

  }

}

module.exports = new Clan();