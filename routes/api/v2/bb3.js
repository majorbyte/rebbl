"use strict";

const { competitions } = require("../../../lib/CyanideService.js");

const dataService = require("../../../lib/DataServiceBB3.js").rebbl3
, express = require('express')
, util = require('../../../lib/util.js');

class bb3Api{
  constructor(){
    this.router = express.Router({mergeParams: true});
    }

  routesConfig(){
    
    this.router.get("/playoffs/:division", this.#playoffs.bind(this));

    return this.router;
  }

  async #playoffs(req,res) {
    let data = {matches: null, league: req.params.league, competition: req.params.division, round:1};
    
    let schedules = await dataService.getSchedules({competitionId:req.params.division});
  
    schedules = schedules.sort(function(a,b){
      return a.id > b.id ? 1 : -1;
    });
  
    data.matches =  this.#groupBy(schedules, "round");

    let missing = ['2','3','4','5','6'];
    let sizes = [32,16,8,4,2,1];
  
    if (data.matches['1'].length < 32){
      for(let k of Object.keys(data.matches).sort((a,b) => b-a)){
        data.matches[`${parseInt(k)+1}`] = data.matches[k];
      }
      data.matches['1'] = [];
    }
  
    let dummy = {"opponents":[{
      "coach":{"id":null,"name":"","twitch":null,"youtube":null,"country":"","lang":""},
      "team":{"id":null,"name":"","logo":"","value":null,"motto":"","score":null,"death":null,"race":""}
      },{
        "coach":{"id":null,"name":"","twitch":null,"youtube":null,"country":"","lang":""},
        "team":{"id":null,"name":"","logo":"","value":null,"motto":"","score":null,"death":null,"race":""}
      }
    ]};

    const competition = await dataService.getCompetition({id:req.params.division});
    data.round = Number(competition.day);

    missing.map(m=>{
  
      if (!data.matches[m]){
        let x = sizes[parseInt(m) -1]; 
        data.matches[m] = [];
        while (x) {
          data.matches[m].push(dummy);
          x--;
        }
      }
    });
  
    let ids = [];
    for(var prop in data.matches){
      data.matches[prop].map(m => ids.push(m.contest_id));
    }
  
    //data.dates = await datingService.search({"id":{$in:ids}});
  
    res.status(200).send(data);
  }

  #groupBy(xs, key) {
    return xs.reduce(function(rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  }

}

module.exports = bb3Api;