'use strict';
const db = require('../lib/LeagueService.js')
  , ts = require('../lib/teamservice.js')
  , configuration = require('../lib/ConfigurationService.js')
  , util = require('../lib/util.js')
  , express = require('express')
  , router = express.Router();

router.use('/api', require('./api/api'));
router.use('/maintenance', require('./maintenance/maintenance'));
router.use('/wcq', require('./wcq/wcq'));
router.use('/rebbl', require('./rebbl/rebbl'));
router.use('/account', require('./account/account'));
router.use('/signup', require('./signup/signup'));
router.use('/auth', require('./account/auth'));
router.use('/coach', require('./coach/coach'));

router.get('/', util.checkCache, async function(req, res, next){
    let data = {bigo:null,gman:null,rel:null, rounds:null, league:req.params.league };
    data.bigo = await db.getCoachScore("REBBL[\\s-]+Big O", "Season 9",true);

    data.gman =  await db.getCoachScore("REBBL[\\s-]+Gman", "Season 9", true);
    data.rel =  await db.getCoachScore("REBBL[\\s-]+Rel", "Season 9", true);

    data.bigocut =  configuration.getPlayoffTickets("Big O");
    data.gmancut =  configuration.getPlayoffTickets("Gman");
    data.relcut =  configuration.getPlayoffTickets("Rel");

    data.playerData = await ts.getPlayerStats();

    data.articles = await configuration.getArticles();
    res.render('rebbl/index', data);
});

module.exports = router;