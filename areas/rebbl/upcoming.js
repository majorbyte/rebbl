'use strict';
const LeagueService = require('../../lib/LeagueService.js')
  , datingService = require("../../lib/DatingService.js")
  , util = require('../../lib/util.js')
  , express = require('express')
  , router = express.Router({mergeParams: true});

const  _groupBy = function(xs, key) {
    return xs.reduce(function(rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  };

router.get('/', async function(req, res){
    let n = await datingService.all();    
    let dates = [...new Set(n.map(date=> date.id))];

    let schedules = await LeagueService.searchLeagues({"contest_id":{$in:dates}});

    schedules.map(x => {
        x.scheduledDate = n.find(s => s.id === x.contest_id).date;
        x.short = x.scheduledDate.substr(0,10);
    })

    schedules = _groupBy(schedules,"short");

    res.render("rebbl/upcoming/index",{schedules:schedules});
});

router.get('/:date', async function(req, res){


});


module.exports = router;