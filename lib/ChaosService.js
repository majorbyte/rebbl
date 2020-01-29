"use strict";

const bloodBowlService = require("./bloodbowlService.js")
  , cyanideService = require("./CyanideService.js")
  , dataService = require("./DataService.js").cripple
  , loggingService = require("./loggingService.js")
  , cache = require("memory-cache");


class ChaosService{
  constructor(){
    this.cache = cache;
    this.allSkills = [];
  }

  async init(socket){

    this.socket = socket;
  }


  async getMatch(id){
    try {
  

      let exist = await dataService.getMatch({"uuid": id});

      if (exist) return null;//already exists

      let match = await cyanideService.match({match_id: id});

      if (!match) return null; 


      dataService.insertMatch(match);

      return id;

    } catch(e) {
      loggingService.error(e);
    }

    return null;
  }

  async getMatches(){
    try {
      if (!dataService.isConnected){
        console.log("need to wait for connection");
        return;
      }
      const league = await cyanideService.league({platform:"pc",league:"Chaos Cup"});

      if (!league) return;

      let now = new Date(Date.now());

      now.setHours(now.getHours()-2,now.getMinutes()-2);

      let lastMatch = new Date(league.league.date_last_match);

      if (lastMatch < now) return;
      now.setHours(now.getHours()-2);

      const ids = await cyanideService.matches({league:"Chaos Cup", start: now.toISOString(),id_only:1,limit:2000})
      
      if (ids)
        await Promise.all(ids.matches.map(async id => this.getMatch(id.uuid)));

      await this.updateDeaths();
      this.notifyClients();

    }
    catch(ex){
      loggingService.error(ex);
    }
  }


  async updateDeaths(){

    const matches = await dataService.getMatches({"match.leaguename":"Chaos Cup"});

    let data = [];
    matches.map(x => {
      [0,1].map(i => {
        if (!x.match) return;
        let coach = data.find(c => c.coach === x.match.coaches[i].coachname);
        if (!coach){
          coach = {
            coach: x.match.coaches[i].coachname,
            kills:0
          };
          data.push(coach);
        }
        i = Math.abs(i-1);
        coach.kills += x.match.teams[i].sustaineddead;
      });
    });

    data = data.sort((a,b) => {
      if (a.kills > b.kills) return -1;
      if (a.kills < b.kills) return 1;
      return 0;
    });

    let result = data.splice(0,3);
    let o = {
      name:"chaos",
      data:result
    };
    await dataService.updateCasualties({"name":"chaos"},o ,{upsert:true} )
  }

  async getCasualties(){
    if  (!dataService.isConnected) return;

    let data = cache.get("chaosData");
    if (data) return data;

    data = await dataService.getCasualties({"name":"chaos"});
    cache.put("chaosData", data);

    return data;
  }

  async notifyClients(){

    cache.del("chaosData");
    
    let cas = await this.getCasualties();

    cache.put("chaosData", cas);

    this.socket.emit('chaos',cas);
  }

}

module.exports = new ChaosService();
