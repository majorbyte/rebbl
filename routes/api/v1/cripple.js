'use strict';
const crippleService = require('../../../lib/crippleService.js')
  , util = require('../../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});

const load = async(filter) => {
  let data = await crippleService.getStandings();
  if (filter) data = data.filter(x => x.gp > 9);
  return data.sort((a,b) => a.score > b.score ? -1 : 1);
}

router.get('/standings/complete', util.cache(10*60), async function(req, res){
  res.status(200).send(await load(false));
});

router.get('/standings', util.cache(10*60), async function(req, res){
  res.status(200).send(await load(true));
});


module.exports = router;