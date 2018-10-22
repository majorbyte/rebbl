'use strict';
const db = require('../../lib/teamservice.js')
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router()
  , skills = require("../../datastore/skillDescriptions.js");

router.get('/:team_id', util.checkCache, async function(req, res, next){
  let data =  await db.getTeamStats(req.params.team_id);

  data.skills = [];
  await data.roster.map(async player => {
    if (player.skills) {
      player.skills.map(async skill => {
        let description = await skills.skillDescriptions.find(s => s.name.toLowerCase().replace(/[ \-']/g,'') === skill.toLowerCase().trim() )
        if (description) {
          description.id = description.name.toLowerCase().replace(/[ \-']/g,'');
          if (data.skills.indexOf(description) === -1) data.skills.push(description);
        }

      });
    }
  });
  res.render('rebbl/team/team', data);
});

module.exports = router;