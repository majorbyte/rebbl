"use strict";
const cache = require("memory-cache");
const accountService = require("./accountService.js");



module.exports = {
  checkCache : function(req, res, next){
    /*if (process.env.NODE_ENV !== "production") {
      next();
      return;
    }*/
    let key = req.originalUrl || req.url;
    let cachedBody = cache.get(key);
    if (cachedBody) {
      if (key.indexOf("/api") === 0) {
        res.send(cachedBody);
      } else {
        res.render("no-cache-layout",{data:cachedBody}, function(error, html){
          res.send(html);
        });
      }
    } else {
      res.sendResponse = res.send;
      if (key.indexOf("/api") === 0){
        res.send = (body) => {
          cache.put(key, body);
          res.sendResponse(body);
        };
      }else {
        res.send = (body) => {
          cache.put(key, body);
          //res.sendResponse(body);
          res.render("no-cache-layout",{data:body}, function(error, html){
            res.sendResponse(html);
          });
        };
      }
      next();
    }
  },
  // Simple route middleware to ensure user is authenticated.
  //   Use this route middleware on any resource that needs to be protected.  If
  //   the request is authenticated (typically via a persistent login session),
  //   the request will proceed.  Otherwise, the user will be redirected to the
  //   login page.
  ensureAuthenticated: function (req, res, next) {
    if (res.locals.user) { return next(); }
    req.session.returnUrl = req.originalUrl;
    res.redirect("/account/login");
  },

  ensureLoggedIn: function (req, res, next) {
    if (req.user.name) { return next(); }
    req.session.returnUrl = req.originalUrl;
    res.redirect("/account/login");
  },


  ensureAuthenticatedApi: function (req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.status(403).send();
  },

  checkAuthenticated: async function(req,res,next){
    if(req.isAuthenticated()){
      res.locals.user = await accountService.getAccount(req.user.name);
    }
    return next();
  },

  hasRole: function(role){
    return function(req, res, next) {
      return accountService.hasRole(req.user.name, role).then(result => result ? next() : res.status(403).send())
    }
  }
};