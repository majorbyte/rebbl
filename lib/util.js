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
      if (key.indexOf("/api") > -1) {
        res.json(cachedBody);
      } else {
        res.render("no-cache-relayout",{data:cachedBody}, function(error, html){
          res.send(html);
        });
      }
    } else {
      res.sendResponse = res.send;
      if (key.indexOf("/api") > -1){
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
        if (key.indexOf("/api") > -1) {
          res.json(cachedBody);
        } else if (key.indexOf("/caster") === 0) {
          res.send(cachedBody);
        } else {
          res.render("no-cache-relayout",{data:cachedBody}, function(error, html){
            res.send(html);
          });
        }
        return;
      } else {
        res.sendResponse = res.send;
        if (key.indexOf("/api") > -1){
          res.send = (body) => {
            if (typeof body === "string" && body.indexOf("<") !== 0)
              cache.put(key, JSON.parse(body),duration*1000);
            else
              cache.put(key, body,duration*1000);

            res.sendResponse(body);
          };
        } else if (key.indexOf("/caster") === 0) {  
          res.send = (body) => {
            cache.put(key, body,duration*1000);
            res.sendResponse(body);
          };
        } else {
          res.send = (body) => {
            cache.put(key, body,duration*1000);
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

  ensureAuthenticatedNoRedirect: function (req, res, next) {
    try{
      if (res.locals.user) { return next(); }
      res.sendStatus(403);
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
  },
  getISOWeek: function(date) {
    
    if (date == null) date = new Date();
    const newYear = new Date(date.getFullYear(),0,1);
    let day = newYear.getDay() - 1; //the day of week the year begins on
    day = (day >= 0 ? day : day + 7);
    const daynum = Math.floor((date.getTime() - newYear.getTime() - 
    (date.getTimezoneOffset()-newYear.getTimezoneOffset())*60000)/86400000) + 1;
    let weeknum;
    //if the year starts before the middle of a week
    if(day < 4) {
        weeknum = Math.floor((daynum+day-1)/7) + 1;
        if(weeknum > 52) {
            let nYear = new Date(date.getFullYear() + 1,0,1);
            let nday = nYear.getDay() - 1;
            nday = nday >= 0 ? nday : nday + 7;
            /*if the next year starts before the middle of
              the week, it is week #1 of that year*/
            weeknum = nday < 4 ? 1 : 53;
        }
    }
    else {
        weeknum = Math.floor((daynum+day-1)/7);
    }
    return weeknum;
  },
  getDateFromUUID: function(uuid){
    let timestampHex = `${uuid.substr(15,3)}${uuid.substr(9,4)}${uuid.substr(0,8)}`;
    let timestamp = parseInt(timestampHex,16);
    /* 
      seconds: expressed as the number of seconds since the date of Gregorian reform to the Christian calendar, which is set at October 15, 1582. 
    */
    let seconds = timestamp / (10*1000*1000) 
  
    /*
      we can convert this to unix time by subtracting the number of seconds between that date and January 1, 1970 
    */
    seconds -= (141427 * 24 * 60 * 60);
  
    return new Date(seconds*1000);
  }
};

