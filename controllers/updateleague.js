const db = require('../lib/leagueservice')
  , cache = require('memory-cache');

exports.name = 'updateleague';

exports.show = async function(req, res){
  if (req.query.verify === process.env['verifyToken']){
    await db.getRebblData();
  }
  res.redirect('/coach');
};
