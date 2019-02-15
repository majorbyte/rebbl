'use strict';
const db = require('../../lib/LeagueService.js')
  , util = require('../../lib/util.js')
  , datingService = require("../../lib/DatingService.js")
  , express = require('express')
  , router = express.Router({mergeParams: true});

router.get('/:division', util.checkCache, async function(req,res) {
  let data = {matches: null, divisions: null, league: req.params.league, competition: req.params.division};
  
  let leagueRegex;
  let divRegex = new RegExp(`^${req.params.division}$`, 'i');
  leagueRegex = new RegExp(`^ReBBL Playoffs`,'i');

  if (req.params.division === "playins - s10"){
    let comp = "Play-Ins Qualifier";
    divRegex = new RegExp(`^${comp}`, 'i');
  }

  
  data.matches = await db.getLeagues({league: {"$regex": leagueRegex}, competition: {"$regex": divRegex}});

  let missing = ['2','3','4','5','6'];
  let sizes = [32,16,8,4,2,1];
  let dummy =  {"opponents":[{
    "coach":{"id":null,"name":"","twitch":null,"youtube":null,"country":"","lang":""},
    "team":{"id":null,"name":"","logo":"","value":null,"motto":"","score":null,"death":null,"race":""}
    },{
      "coach":{"id":null,"name":"","twitch":null,"youtube":null,"country":"","lang":""},
      "team":{"id":null,"name":"","logo":"","value":null,"motto":"","score":null,"death":null,"race":""}
    }
  ]};

  missing.map(m=>{

    if (!data.matches[m]){
      let x = sizes[parseInt(m) -1]; 
      data.matches[m] = [];
      while (x) {
        data.matches[m].push(dummy);
        x--
      }


    }

  });


  let ids = []
  for(var prop in data.matches){
    data.matches[prop].map(m => ids.push(m.contest_id));
  }

  data.dates = await datingService.search({"id":{$in:ids}})

  res.render('rebbl/playoffs/knockout', data);
});

module.exports = router;