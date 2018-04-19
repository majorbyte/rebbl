const db = require('../lib/leagueservice')
  , cache = require('memory-cache');


exports.name = 'league';
exports.engine = 'pug';

exports.cache = function(req, res, next){
  let key = '__league__' + req.originalUrl || req.url;
  let cachedBody = cache.get(key);
  if (cachedBody) {
    res.send(cachedBody);
  } else {
    res.sendResponse = res.send;
    res.send = (body) => {
      cache.put(key, body);
      res.sendResponse(body);
    };
    next();
  }
};

exports.show = async function(req, res, next){
  let data = {standings:null, rounds:null, league:req.params.league_id };
  data.standings = await db.getCoachScore("REBBL - " + req.params.league_id);
  data.rounds = await db.getDivisions("REBBL - " + req.params.league_id);

  res.render('show', data);
};


exports.division = async function(req,res,next){

  let data = {matches:null, divisions:null, league:req.params.league,competition: req.params.division };
  data.matches = await db.getLeagues({league: "REBBL - " + req.params.league, competition: req.params.division.indexOf("Season") > -1 ? req.params.division : "Season 8 - " + req.params.division});
  data.divisions = await db.getDivisions("REBBL - " + req.params.league);

  res.render('showDivision', data);
};

exports.divisionRound = async function(req,res,next){

  let week = parseInt(req.params.week);

  if (week > 0){
    let data = {matches:null, divisions:null, league:req.params.league, competition: req.params.division, week: week };
    data.matches = await db.getLeagues({round: week, league: "REBBL - " + req.params.league, competition: req.params.division.indexOf("Season") > -1 ? req.params.division : "Season 8 - " + req.params.division});
    data.divisions = await db.getDivisions("REBBL - " + req.params.league);
    data.weeks = await db.getWeeks("REBBL - " + req.params.league, req.params.division.indexOf("Season") > -1 ? req.params.division : "Season 8 - " + req.params.division);

    res.render('showDivisionRound', data);
  } else {
    res.redirect(`/league/${req.params.league}`);
  }

};