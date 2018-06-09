'use strict';
const db = require('../../../lib/SignUpService.js')
  , cache = require('memory-cache')
  , express = require('express')
  , router = express.Router();


const ensureAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  req.session.returnUrl = req.baseUrl;
  res.redirect('/account/login');
};

router.get('/', ensureAuthenticated, async function(req, res,next){

  if (['FullMetalCOS', 'minorbyte', 'Harringzord', 'Miraskadu'].indexOf(req.user.name) === -1){
    next( new Error(403) );
  } else {
    const data = await db.getSignUps({'greenHorn':true});

    const csv = data.map(function(row){
      return `${JSON.stringify(row.team)},${JSON.stringify(row.race)},${JSON.stringify(row.timezone)},${JSON.stringify(row.reddit)},${JSON.stringify(row.discord)},${JSON.stringify(row.coach)},${JSON.stringify(row.steam)},${JSON.stringify(row.league)}`
    });

    csv.unshift('team name,race,timezone,reddit name,discord,blood bowl 2 name,steam name,reqion');


    res.setHeader("content-type", "text/csv");
    res.set('Content-Type', 'application/octet-stream');
    res.attachment('greenhorn.csv');
    res.status(200).send(csv.join('\r\n'));
  }

});


module.exports = router;