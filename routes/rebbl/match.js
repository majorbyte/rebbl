'use strict';
const   
  leagueService = require("../../lib/LeagueService.js")
  , bloodBowlService = require("../../lib/bloodbowlService.js")
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams:true})
  , bloodbowlService = require("../../lib/bloodbowlService.js");

router.get('/unplayed/:match_id',util.checkCache, async function(req, res, next){
  try{
    let match = await leagueService.getUnplayedMatch(req.params.match_id);

    res.render('rebbl/match/unplayed',{matches: match,company:req.params.company} );
  } catch(err){
    console.log(err);
  }
});

router.get('/:match_id', util.cache(600), async function(req, res, next){
  let data = await leagueService.getMatchDetails(req.params.match_id);
  data.lonersValue = [await bloodBowlService.getLonerCost(data.match.teams[0].idraces), await bloodBowlService.getLonerCost(data.match.teams[1].idraces)]
  if (!data) return next('route');

  data.skills =[];

  let skillDescriptions = await bloodbowlService.getSkillDescriptions();

  if (data.match.teams[0].roster) {
    await data.match.teams[0].roster.map(async player => {
      player.skills.map(async skill => {
        let description = skillDescriptions.find(s => s.name.toLowerCase().replace(/[ \-']/g,'') === skill.toLowerCase().trim() )
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
        let description = skillDescriptions.find(s => s.name.toLowerCase().replace(/[ \-']/g,'') === skill.toLowerCase().trim() )
        if (description) {
          description.id = description.name.toLowerCase().replace(/[ \-']/g,'');
          if (data.skills.indexOf(description) === -1) data.skills.push(description);
        }

      });
    });
  }
  data.company=req.params.company;
  res.render('rebbl/match/match', data);
});



module.exports = router;