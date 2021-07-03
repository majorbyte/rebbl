"use strict";
const dataService = require('../../../lib/DataService.js').rebbl
, express = require('express')
, util = require('../../../lib/util.js');

class PlayoffsApi{
  constructor(){
    this.router = express.Router({mergeParams: true});

    this.bracket = [
      {league:'REBBL - REL', division:'Season 17 - Division 1', position:1},
      {placeholder:'REL BYE WEEK'},
      {special:'Division 3', position:7},
      {league:'REBBL - Big O', division:'Season 17 Division 2', position:2},
      {league:'REBBL - GMan', division:'Season 17 - Division 2A', position:2},
      {league:'REBBL - REL', division:'Season 17 - Division 4E', position:1},
      {league:'REBBL - REL', division:'Season 17 - Division 4C', position:1},
      {special:'Division 3', position:1},
      {league:'REBBL - Big O', division:'Season 17 Division 1', position:4},
      {league:'REBBL - REL', division:'Season 17 - Division 3C', position:2},
      {league:'REBBL - GMan', division:'Season 17 - Division 4E', position:1},
      {league:'REBBL - GMan', division:'Season 17 - Division 2A', position:3},
      {league:'REBBL - GMan', division:'Season 17 - Division 1', position:4},
      {placeholder:'REL Play-Ins B Winner'},
      {placeholder:'REL Play-Ins A Winner'},
      {league:'REBBL - Big O', division:'Season 17 Division 2', position:3},
      {league:'REBBL - Big O', division:'Season 17 Division 1', position:2},
      {league:'REBBL - GMan', division:'Season 17 - Division 4F', position:1},
      {league:'REBBL - GMan', division:'Season 17 - Division 4G', position:1},
      {league:'REBBL - REL', division:'Season 17 - Division 2B', position:1},
      {league:'REBBL - GMan', division:'Season 17 - Division 2B', position:3},
      {league:'REBBL - REL', division:'Season 17 - Division 3A', position:2},
      {placeholder:'GMAN Play-Ins B Winner'},
      {special:'Division 3', position:2},
      {league:'REBBL - REL', division:'Season 17 - Division 2A', position:1},
      {placeholder:'Big O Play-Ins Winner'},
      {league:'REBBL - REL', division:'Season 17 - Division 4B', position:1},
      {league:'REBBL - REL', division:'Season 17 - Division 1', position:4},
      {league:'REBBL - GMan', division:'Season 17 - Division 1', position:2},
      {league:'REBBL - GMan', division:'Season 17 - Division 4D', position:1},
      {league:'REBBL - GMan', division:'Season 17 - Division 4B', position:1},
      {special:'Division 3', position:4},
      {league:'REBBL - Big O', division:'Season 17 Division 1', position:1},
      {placeholder:'BIG O BYE WEEK'},
      {league:'REBBL - REL', division:'Season 17 - Division 3B', position:2},
      {league:'REBBL - REL', division:'Season 17 - Division 2A', position:2},
      {league:'REBBL - GMan', division:'Season 17 - Division 1', position:3},
      {league:'REBBL - REL', division:'Season 17 - Division 4G', position:1},
      {league:'REBBL - GMan', division:'Season 17 - Division 4H', position:1},
      {league:'REBBL - REL', division:'Season 17 - Division 2B', position:3},
      {league:'REBBL - GMan', division:'Season 17 - Division 2A', position:1},
      {special:'Division 3', position:6},
      {placeholder:'GMAN Play-Ins A Winner'},
      {league:'REBBL - REL', division:'Season 17 - Division 2B', position:2},
      {special:'Division 3', position:3},
      {league:'REBBL - GMan', division:'Season 17 - Division 3B', position:2},
      {league:'REBBL - REL', division:'Season 17 - Division 4D', position:1},
      {league:'REBBL - REL', division:'Season 17 - Division 1', position:2},
      {league:'REBBL - GMan', division:'Season 17 - Division 1', position:1},
      {placeholder:'GMAN BYE WEEK'},
      {league:'REBBL - REL', division:'Season 17 - Division 4A', position:1},
      {league:'REBBL - GMan', division:'Season 17 - Division 2B', position:2},
      {league:'REBBL - GMan', division:'Season 17 - Division 2B', position:1},
      {league:'REBBL - GMan', division:'Season 17 - Division 3A', position:2},
      {league:'REBBL - GMan', division:'Season 17 - Division 3C', position:2},
      {league:'REBBL - Big O', division:'Season 17 Division 1', position:3},
      {league:'REBBL - Big O', division:'Season 17 Division 2', position:1},
      {league:'REBBL - REL', division:'Season 17 - Division 4F', position:1},
      {special:'REBBL - Big O 3', position:2},
      {special:'Division 3', position:5},
      {league:'REBBL - REL', division:'Season 17 - Division 2A', position:3},
      {league:'REBBL - GMan', division:'Season 17 - Division 4A', position:1},
      {league:'REBBL - GMan', division:'Season 17 - Division 4C', position:1},
      {league:'REBBL - REL', division:'Season 17 - Division 1', position:3}
    ];
  
    this.division3 =[
      {league:'REBBL - GMan', division:'Season 17 - Division 3A', position:1},
      {league:'REBBL - GMan', division:'Season 17 - Division 3B', position:1},
      {league:'REBBL - GMan', division:'Season 17 - Division 3C', position:1},
      {league:'REBBL - REL', division:'Season 17 - Division 3A', position:1},
      {league:'REBBL - REL', division:'Season 17 - Division 3B', position:1},
      {league:'REBBL - REL', division:'Season 17 - Division 3C', position:1}
    ];
    
    this.bigO = [
      {league:'Big O', division:'Season 17 Division 4A', position:1},
      {league:'Big O', division:'Season 17 Division 4B', position:1},
    ];    
  }
  routesConfig(){
    
    this.router.get("/playoffs",/*util.cache(600),*/ this.getPlayoffPredictions.bind(this));

    return this.router;
  }

  async getPlayoffPredictions(req,res){
    try {
      let standings = await dataService.getStandings({season:"season 17", league:/rebbl/i});
      let result = [];
      for(let i = 0; i<64;i++){
        let m = this.bracket[i];

        if (m.league){
          let r = standings.find(x => x.league.localeCompare(m.league,undefined,{ sensitivity: 'base' }) === 0 && x.competition.localeCompare(m.division,undefined,{ sensitivity: 'base' }) === 0 && x.position === m.position);
          result.push(r);
        } else {
          result.push(m);
        }
      }

      const coach = function(c) {
        if (c.league) return {"id":c.id,"name":c.name,"twitch":null,"youtube":null,"country":"","lang":"", league:c.league.toUpperCase(), division: c.competition, position:c.position};
        return {"id":0,"name":c.placeholder || `${c.special}-${c.position}`,"twitch":null,"youtube":null,"country":"","lang":""};
      }

      const team = function(t) {
        if (t.league) return {"id":t.teamId,"name":t.team,"logo":t.logo,"value":null,"motto":"","score":null,"death":null,"race":t.race};
        return {"id":0,"name":t.placeholder || `${t.special}-${t.position}`,"logo":"fist_01","value":null,"motto":"","score":null,"death":null,"race":"Human"};
        
      }

      const match = function(home, away){
        return {"opponents":[{
          "coach":coach(home),
          "team":team(home)
          },{
            "coach":coach(away),
            "team":team(away)
            }
        ]}
      }
      const matches = [];

      for(let i = 0; i < 64;i+=2){
        matches.push(match(result[i],result[i+1]));
      }
     
      res.json(matches);
    }
    catch (ex){
      console.error(ex);
      res.status(500).send('Something something error');
    }
  }

}  

module.exports = PlayoffsApi;