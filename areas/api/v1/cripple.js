'use strict';
const crippleService = require('../../../lib/crippleService.js')
  , util = require('../../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});

router.get('/standings', util.checkCache, async function(req, res){
  let data = await crippleService.getStandings();

  data = data.sort((a,b) => a.score > b.score ? -1 : 1);
  
  res.status(200).send(data);
});

module.exports = router;