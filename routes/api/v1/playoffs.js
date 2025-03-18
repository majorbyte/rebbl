'use strict';
const db = require('../../../lib/LeagueService.js')
  , dataService = require("../../../lib/DataService.js").rebbl
  , datingService = require("../../../lib/DatingService.js")
  , util = require('../../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});


router.get('/seasons', util.cache(60*60*24), async function(req,res){
  try{  
    const seasons = await dataService.getSeasons({league:'ReBBL Playoffs'});
    res.json(seasons);
  }
  catch (ex){
    console.error(ex);
    res.status(500).send('Something something error');
  }
});

router.get('/:division', util.cache(10*60), async function(req,res) {
  try{

    let data = {matches: null, league: req.params.league, competition: req.params.division, round:1};
    
    let leagueRegex = new RegExp(`^ReBBL Playoffs`,'i');
    let divRegex = new RegExp(`^${req.params.division}$`, 'i');
    
    data.matches = await db.getLeagues({league: {"$regex": leagueRegex}, competition: {"$regex": divRegex}});

    if (!data.matches.hasOwnProperty('1')) return res.status(204).send({msg: `No data found for ${req.params.division} - please check the competition name.`})

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
    if (req.app.locals.cyanideEnabled)
      data.round = await db.getRound("ReBBL Playoffs", req.params.division);
    else 
      data.round = 0;

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

    data.dates = await datingService.search({"id":{$in:ids}});

    res.status(200).send(data);
  }
  catch(e){
    res.status(400).send({error: e.message});
  }
});

module.exports = router;

