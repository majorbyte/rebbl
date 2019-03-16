'use strict';
const  skills = require("../../../datastore/skillDescriptions.js")
  , dataService = require("../../../lib/DataService.js").rebbl
  , util = require('../../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});


router.get('/skills', util.checkCache, async function(req, res){
  res.status(200).send(skills.skillDescriptions);
});

router.get('/playertypes/:race', util.checkCache, async function(req, res){
  let data = await dataService.getPlayerTypes({race:Number(req.params.race)});
  res.status(200).send(data);
});

router.get('/starplayers', util.checkCache, async function(req, res){
  let data = await dataService.getStarPlayers({});
  res.status(200).send(data);
});


module.exports = router;