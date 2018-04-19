const db = require('../lib/dataservice')
  , cache = require('memory-cache');

exports.name = 'update';

exports.before = async function(req, res, next){
  var round = req.params.update_id;
  if (!round ) return next();

  req.round = parseInt(round);
  // cant find that coach
  if (!req.round) return next('route');
  // found it, move on to the routes
  next();
};


exports.show = async function(req, res){
  if (req.query.verify === process.env['verifyToken']){
    await db.getLeagueData(req.round);
    //await db.updateCoachScoringPoints(126587);
  }
  res.redirect('/coach');
};
