'use strict';
const 
  cache = require("memory-cache")
  , dataService = require('../../lib/DataService.js').rebbl
  , express = require('express')
  , router = express.Router({mergeParams:true});

router.get('/:team_id', /*util.cache(10*60),*/ async function(req, res){
  if (req.headers['user-agent'].indexOf("https://discordapp.com") > -1){
    let team = await dataService.getTeam({"team.id":Number(req.params.team_id)});
    if(team){
      let standing = await dataService.getStandings({teamId:team.team.id},{sort:{season:-1},collation:{locale:"en_US", numericOrdering: true },limit:1 });
      res.render('team/discord',{team:team,company:req.params.company,standing:standing[0]});
    } else res.status(500).send("Team not found");
  } else {
    let cachedBody = cache.get(req.baseUrl);
    if (cachedBody) {
      res.render("no-cache-relayout",{data:cachedBody}, function(error, html){
        res.send(html);
      });
    } else {
      res.sendResponse = res.send;
      res.send = (body) => {
        cache.put(req.baseUrl, body);
        res.render("no-cache-relayout",{data:body}, function(error, html){
          res.sendResponse(html);
        });
      };
      res.render('team/team',{company:req.params.company});
    }
  }
});

module.exports = router;