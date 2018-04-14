const db = require('../lib/datahandler.js')
      , cache = require('memory-cache');


exports.name = 'coach';
exports.engine = 'pug';

exports.before = async function(req, res, next){
  var id = req.params.coach_id;
  if (!id) return next();

  req.coach = await db.getCoach(id);
  // cant find that coach
  if (!req.coach) return next('route');
  // found it, move on to the routes
  next();
};

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

exports.list = async function(req, res, next){
  let data = await db.getSchedules();
  data['rounds'] = await db.rounds();
  res.render('list', data);
};

exports.show = async function(req, res, next){
  req.coach['rounds'] = await db.rounds();
  res.render('show', req.coach);
};
