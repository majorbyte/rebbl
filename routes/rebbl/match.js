'use strict';
const   
  leagueService = require("../../lib/LeagueService.js")
  , bloodBowlService = require("../../lib/bloodbowlService.js")
  , datingService = require("../../lib/DatingService.js")
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams:true})
  , bloodbowlService = require("../../lib/bloodbowlService.js");

router.get('/unplayed/:match_id', async function(req, res){
  try{
    let match = await leagueService.getUnplayedMatch(req.params.match_id);

    res.render('rebbl/match/unplayed',{matches: match,company:req.params.company} );
  } catch(err){
    console.log(err);
  }
});

router.put('/unplayed/:match_id', util.checkAuthenticated, util.hasRole('streamer'), async function(req, res){
  try{
    let contest = [];
    contest = await leagueService.searchLeagues({"contest_id":Number(req.params.match_id) });
    if (contest.length === 0) contest = await leagueService.searchLeagues({matches:{$elemMatch:{contest_id:Number(req.params.match_id) }} });
    
    if(contest.length > 0){
      if (req.body.date.length === 16)
        datingService.updateDate(Number(req.params.match_id == 0 ? req.body.competitionId : req.params.match_id), req.body.date);
      else 
        datingService.removeDate(Number(req.params.match_id == 0 ? req.body.competitionId : req.params.match_id));
      res.send("ok");
    } else {
      res.status(403).send();
    }
  } catch(err){
    console.log(err);
  }
});

router.get('/:match_id', util.cache(600), async function(req, res, next){
  let data = await leagueService.getMatchDetails(req.params.match_id);
  data.lonersValue = [await bloodBowlService.getLonerCost(data.match.teams[0].idraces), await bloodBowlService.getLonerCost(data.match.teams[1].idraces)];
  if (!data) return next('route');

  data.skills =[];

  let skillDescriptions = await bloodbowlService.getSkillDescriptions();

  if (data.match.teams[0].roster) {
    await data.match.teams[0].roster.map(async player => {
      player.skills.map(async skill => {
        let description = skillDescriptions.find(s => s.name.toLowerCase().replace(/[ \-']/g,'') === skill.toLowerCase().trim() );
        if (description) {
          description.id = description.name.toLowerCase().replace(/[ \-']/g,'');
          if (data.skills.indexOf(description) === -1) data.skills.push(description);
        }

      });
    });
  }

  if (data.match.teams[1].roster) {
    await data.match.teams[1].roster.map(async player => {
      player.skills.map(async skill => {
        let description = skillDescriptions.find(s => s.name.toLowerCase().replace(/[ \-']/g,'') === skill.toLowerCase().trim() );
        if (description) {
          description.id = description.name.toLowerCase().replace(/[ \-']/g,'');
          if (data.skills.indexOf(description) === -1) data.skills.push(description);
        }

      });
    });
  }
  data.company= data.match.leaguename.indexOf("mperium") > -1 ? "imperium" : req.params.company;
  res.render('rebbl/match/match', data);
});





module.exports = router;