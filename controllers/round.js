const db = require('../lib/datahandler.js')
  , cache = require('memory-cache');

exports.name = 'round';
exports.engine = 'pug';

exports.cache = function(req, res, next){
  let key = '__express__' + req.originalUrl || req.url;
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
  var id = req.params.round_id;
  if (!id) return next('route');

  let data = await db.getMatches(id);
  // cant find that match
  if (!data) return next('route');
  // found it, move on to the routes

  data['rounds'] = await db.rounds();
  data['round'] = id;

  res.render('show', data);
};
