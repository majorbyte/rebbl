'use strict';
const cache = require('memory-cache');



module.exports = {
  checkCache : function(req, res, next){
    if (process.env.NODE_ENV !== 'production') {
      next();
      return;
    }
    let key = req.originalUrl || req.url;
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
  },
  // Simple route middleware to ensure user is authenticated.
  //   Use this route middleware on any resource that needs to be protected.  If
  //   the request is authenticated (typically via a persistent login session),
  //   the request will proceed.  Otherwise, the user will be redirected to the
  //   login page.
  ensureAuthenticated: function (req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    req.session.returnUrl = req.baseUrl;
    res.redirect('/account/login');
  }

};