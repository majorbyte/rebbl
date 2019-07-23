"use strict";
const dataService = require('./DataService.js').rebbl;

class Clan {
  constructor(){
     
  }

  async getClanByUser(name) {
    return await dataService.getClan({active:true, "members":name});
  }

  async getClanByName(name) {
    return await dataService.getClan({active:true, name:name});
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