'use strict';

const { retirePlayer } = require("../../lib/bb3Service.js");

const 
  accountService = require("../../lib/accountService.js")
  , dataService = require('../../lib/DataService.js').rebbl
  , teamService = require('../../lib/teamservice.js')
  , cache = require("memory-cache")
  , express = require('express')
  , rateLimit = require("express-rate-limit")
  , util = require('../../lib/util.js')
  , router = express.Router({mergeParams:true});

router.get('/:team_id', /*util.cache(10*60),*/ async function(req, res){
  const id = isNaN(req.params.team_id) ?req.params.team_id : Number(req.params.team_id);
  let team = await dataService.getTeam({"team.id":id});

  if (req.headers['user-agent'].indexOf("https://discordapp.com") > -1){
    if(team){
      let standing = await dataService.getStandings({teamId:team.team.id},{sort:{season:-1},collation:{locale:"en_US", numericOrdering: true },limit:1 });
      res.render('team/discord',{team:team,company:req.params.company,standing:standing[0]});
    } else res.status(500).send("Team not found");
  } else {
    /*let cachedBody = cache.get(req.baseUrl);
    if (cachedBody) {
      res.render("no-cache-relayout",{data:cachedBody}, function(error, html){
        res.send(html);
      });
    } else */{
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

const teamUpdateRateLimiter = rateLimit({
  windowMs: 600 * 1000, // 10 minute window
  max: 1, // start blocking after 1 request
  message:
    "Too many requests, please wait 10 minutes",
  keyGenerator: function(req){
    return req.user.name;
  }

});

router.get('/:teamId/update', util.ensureAuthenticated, teamUpdateRateLimiter, async function(req, res){
  try {
    let account = await accountService.getAccount(req.user.name);
    let team = await dataService.getTeam({"team.id":Number(req.params.teamId)});

    if (account.coach === team.coach.name){
      await teamService.updateTeam(Number(req.params.teamId),false);
      cache.del(`/api/v2/team/${req.params.teamId}`);
      cache.del(`/api/v2/team/${req.params.teamId}/players`);
      cache.del(`/api/v2/team/${req.params.teamId}/retiredplayers`);
      cache.del(`/api/v2/team/${req.params.teamId}/hiredplayers`);
    }

    res.redirect(`/team/${req.params.teamId}`);
  }
  catch (ex){
    console.error(ex);
    res.status(500).json({error:'Something something error'});
  }

});

module.exports = router;