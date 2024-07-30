
'use strict';
const accountService = require('../../../lib/accountService.js')
, express = require('express')
, leagueService = require("../../../lib/LeagueService.js")
, util = require('../../../lib/util.js');

class AccountApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }
  routesConfig(){
    this.router.get("/following",util.ensureAuthenticatedNoRedirect, async function(req,res){
      try {
        
        const account = await accountService.getAccount(req.user.name);
        const isFollowing = account.following && account.following.length > 0;

        let data = [];
        if (isFollowing){
          for(var x = 0; x < account.following.length; x++){
            let d = await leagueService.getUpcomingMatch(null, account.following[x]);
            data = data.concat(d);
          }
        } 
        res.json(data);

      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });

    this.router.get("/followers/:coachId", async function(req,res){
      try {
        
         let count = await accountService.followers(Number(req.params.coachId));
         res.json(count);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });


    this.router.get("/following/:coachId",util.ensureAuthenticatedNoRedirect, async function(req,res){
      try {
        
        const account = await accountService.getAccount(req.user.name);
        const isFollowing = account.following && account.following.indexOf(Number(req.params.coachId)) > -1;
        res.status(200).send(isFollowing === true);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });

    this.router.put("/follow/:coachId",util.ensureAuthenticated, async function(req,res){
      try {

        let result = await accountService.follow(req.user.name, Number(req.params.coachId));

        res.status(200).send(result);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });

    this.router.put("/unfollow/:coachId",util.ensureAuthenticated, async function(req,res){
      try {
        let result = await accountService.unfollow(req.user.name, Number(req.params.coachId));

        res.status(200).send(!result);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });
    this.router.put("/schedule",util.ensureAuthenticated, async function(req,res){
      try {
        await accountService.toggleSchedule(req.user.name);

        res.status(200).send();
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });

    this.router.put("/icon/legacy",util.ensureAuthenticated, async function(req,res){
      try {
        await accountService.setIcon(req.user.name, "BB3Legacy");

        res.status(200).send();
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });
    this.router.put("/icon/new",util.ensureAuthenticated, async function(req,res){
      try {
        await accountService.setIcon(req.user.name, "BB3Standard");

        res.status(200).send();
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });

    this.router.get("/me",util.ensureAuthenticatedNoRedirect, async function(req,res){
      const account = await accountService.getAccount(req.user.name);

      res.status(200).send({reddit:account.reddit, bb3id:account.bb3id, coach: account.coach, bb3coach:account.bb3coach, bb3displayId:account.bb3displayId, icon:account.icon || "BB3Standard", doNotLoadSchedules:account.doNotLoadSchedules || false});
    });


    this.router.get('/bb3/:name', util.ensureLoggedIn, async function(req,res){
      res.json(await accountService.getBB3Account(req.params.name));
    });
    
    this.router.post('/bb3', util.ensureAuthenticated, async function(req,res){
      try {
        await accountService.updateBB3Account(req.user.name, req.body);

        res.status(200).send();
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }      
    });

    return this.router;
  }
}  

module.exports = AccountApi;