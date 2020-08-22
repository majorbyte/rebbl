"use strict";
const cache = require("memory-cache");
const accountService = require("./accountService.js");



module.exports = {
  checkCache : (req, res, next) => {
    let key = req.originalUrl || req.url;

    if (Object.prototype.hasOwnProperty.call(req.params,"team_id"))
      key = req.baseUrl;
    let cachedBody = cache.get(key);
    if (cachedBody) {
      if (key.indexOf("/api") === 0) {
        res.json(cachedBody);
      } else {
        res.render("no-cache-relayout",{data:cachedBody}, function(error, html){
          res.send(html);
        });
      }
    } else {
      res.sendResponse = res.send;
      if (key.indexOf("/api") === 0){
        res.send = (body) => {

          if (typeof body === "string")
            cache.put(key, JSON.parse(body));
          else
            cache.put(key, body);

          res.sendResponse(body);
        };
      }else {
        res.send = (body) => {
          cache.put(key, body);
          res.render("no-cache-relayout",{data:body}, function(error, html){
            res.sendResponse(html);
          });
        };
      }
      next();
    }
  },

  cache: (duration) => {
    return (req, res, next) => {
      let key = req.originalUrl || req.url;
      let cachedBody = cache.get(key);
      if (cachedBody) {
        if (key.indexOf("/api") === 0) {
          res.json(cachedBody);
        } else {
          res.render("no-cache-relayout",{data:cachedBody}, function(error, html){
            res.send(html);
          });
        }
        return;
      } else {
        res.sendResponse = res.send;
        if (key.indexOf("/api") === 0){
          res.send = (body) => {

            //if (typeof body === "string")
            //  cache.put(key, JSON.parse(body),duration*1000);
            //else
            //  cache.put(key, body,duration*1000);

            res.sendResponse(body);
          };
        }else {
          res.send = (body) => {
            //cache.put(key, body,duration*1000);
            res.render("no-cache-relayout",{data:body}, function(error, html){
              res.sendResponse(html);
            });
          };
        }
        next();
      }
    };
  },

  // Simple route middleware to ensure user is authenticated.
  //   Use this route middleware on any resource that needs to be protected.  If
  //   the request is authenticated (typically via a persistent login session),
  //   the request will proceed.  Otherwise, the user will be redirected to the
  //   login page.
  ensureAuthenticated: function (req, res, next) {
    try{
      if (res.locals.user) { return next(); }
      req.session.returnUrl = req.originalUrl;
      if (req.isAuthenticated()){
        res.redirect("/account/create");
      } else {
        res.redirect("/account/login");
      }
    }
    catch(ex){
      console.log(ex.message);
      console.log(ex.stack);
    }
  },

  ensureLoggedIn: function (req, res, next) {
    try{
      if (req.user && req.user.name) { return next(); }
      req.session.returnUrl = req.originalUrl;
      if (req.isAuthenticated()){
        res.redirect("/account/create");
      } else {
        res.redirect("/account/login");
      }
    }
    catch(ex){
      console.log(ex.message);
      console.log(ex.stack);
    }
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

  checkBadBots: function(req,res,next){
    let agent = req.headers['user-agent'];
    if(agent && agent.indexOf("BLEXBot")>-1) res.redirect(301,"http://webmeup-crawler.com/");
    else if(agent && agent.indexOf("Baiduspider") >-1) res.redirect(301, "http://www.baidu.com/search/spider.html");
    else if(agent && agent.indexOf("TweetmemeBot") >-1) res.redirect(301, "https://datasift.com/bot.html");
    else return next();    
  },

  hasRole: function( ...args ){
    return function(req, res, next) {
      
      return accountService.hasRole(req.user.name, ...args).then(result => result ? next() : res.status(403).send(""));
    };
  },

  verifyMaintenanceToken:function(req, res, next) {
    return req.query.verify === process.env['verifyToken'] ? next() : res.status(403).send();
  }
};