'use strict';
const db = require('../../../lib/signupService')
  , cache = require('memory-cache')
  , express = require('express')
  , router = express.Router();


const ensureAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  req.session.returnUrl = req.baseUrl;
  res.redirect('/account/login');
};

router.get('/', ensureAuthenticated, async function(req, res, next){
  if (['FullMetalCOS', 'minorbyte', 'Harringzord', 'Miraskadu'].indexOf(req.user.name) === -1 ){
    next( new Error(403) );
  } else {
    const data = await db.getSignups();

    const csv = data.map(function(row){
      return `${JSON.stringify(row.team)},${JSON.stringify(row.race)},${JSON.stringify(row.TZ)},${JSON.stringify(row.saveType)},${JSON.stringify(row.reddit)},${JSON.stringify(row.discord)},${JSON.stringify(row.coach)},${JSON.stringify(row.steam)},${JSON.stringify(row.league)},${JSON.stringify(row.competition)}`;
    });

    csv.unshift('team name,race,timezone,state,reddit name,discord,blood bowl 2 name,steam name,league,division');


    res.setHeader("content-type", "text/csv");
    res.set('Content-Type', 'application/octet-stream');
    res.attachment('signups.csv');
    res.status(200).send(csv.join('\r\n'));
  }
});


module.exports = router;