"use strict";
const cache = require("memory-cache");
const accountService = require("./accountService.js");



module.exports = {
  checkCache : function(req, res, next){
    if (process.env.NODE_ENV !== "production") {
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
    req.session.returnUrl = req.originalUrl;
    res.redirect("/account/login");
  },

  ensureAuthenticatedApi: function (req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.status(403).send();
  },

  checkAuthenticated: function(req,res,next){
    req.isAuthenticated()
    return next();
  },

  hasRole: function(role){
    return function(req, res, next) {
      return accountService.hasRole(req.user.name, role).then(result => result ? next() : res.status(403).send())
    }
  }
};