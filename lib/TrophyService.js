"use strict";

const dataService = require("./DataService.js").rebbl;

class TrophyService{
  constructor() {
  }

  async getTrophy (name) { 
    return await dataService.getTrophy({name:name})
  }  

  async getTrophies () { 
    return await dataService.getTrophies({});
  }  

  update(name, trophy){
    dataService.updateTrophy({"name":name},trophy,{upsert:true})

  }

  delete(trophy){
    dataService.deleteTrophy(trophy)
  }

}


module.exports = new TrophyService();