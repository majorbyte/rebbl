const db = require('../lib/dataservice')
  , cache = require('memory-cache');

exports.name = 'match';
exports.engine = 'pug';

exports.before = async function(req, res, next){
  var id = req.params.match_id;
  if (!id) return next();

  req.match= await db.getMatchDetails(id);
  // cant find that match
  if (!req.match) return next('route');
  // found it, move on to the routes
  next();
};

exports.cache = function(req, res, next){
  let key = '__match__' + req.originalUrl || req.url;
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
  req.match['rounds'] = await db.rounds();
  res.render('show', req.match);
};
