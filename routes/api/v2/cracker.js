'use strict';
const accountService = require('../../../lib/accountService.js')
  , crackerService = require("../../../lib/ChristmasCracker.js")
  , cyanideService = require("../../../lib/CyanideService.js")
  , express = require('express')
  , util = require('../../../lib/util.js');

class CrackerApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }

  routesConfig(){
    this.router.get("/", util.ensureAuthenticated, this._getCoachInfo);

    this.router.get("/load/:teamName", util.ensureAuthenticated,this._loadTeam);
    this.router.post("/register/:teamName", util.ensureAuthenticated,this._registerTeam);

    this.router.post("/review", util.ensureAuthenticated,this._reviewTeam);
    this.router.get("/review", util.ensureAuthenticated,this._getReview);

    this.router.get("/packs", util.ensureAuthenticated, this._getPacks);
    this.router.get("/rebuild", util.ensureAuthenticated, this._rebuild);

    return this.router;
  }


  async _getCoachInfo(req,res){
    const account = await accountService.getAccount(req.user.name);

    let coach = await crackerService.getCoachInfo(account.coach);

    if (coach) res.json(coach);  
    else res.status(404).json({error:"not registered yet"});
  }

  async _loadTeam(req,res){

    let team = await cyanideService.team({name:req.params.teamName});
    
    if (team) res.status(200).json(team);
    else res.status(400).json([{error:"Team not found"}]);
  }

  async _registerTeam(req,res){
    const account = await accountService.getAccount(req.user.name);

    let result = await crackerService.registerTeam(account.coach, req.params.teamName);

    res.status(200).send(result);
  }

  async _getPacks(req,res){
    const account = await accountService.getAccount(req.user.name);
    let result = await crackerService.getPacks(account.coach);
    res.status(200).send(result.map(x => {
      let card = x.cracker_template;
      card.cardId = x.id;
      return card;
    }));
  }
  async _rebuild(req,res){
    const account = await accountService.getAccount(req.user.name);
    let result = await crackerService.claimPacks(account.coach);
    res.status(200).send(result.map(x => {
      let card = x.cracker_template;
      card.cardId = x.id;
      return card;
    }));
  }
  async _reviewTeam(req,res){
    const account = await accountService.getAccount(req.user.name);

    let review = req.body;
    review.coach = account.coach;

    crackerService.createReview(review);

    res.status(200).send();
  }
  async _getReview(req,res){
    const account = await accountService.getAccount(req.user.name);

    let review = await crackerService.getReview(account.coach);
    if(review){
      delete review.reviewers;
      delete review.reviewComments;
      delete review.result;
    }

    res.status(200).send(review);
    
  }
}

module.exports = CrackerApi;