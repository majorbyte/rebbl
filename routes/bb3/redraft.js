'use strict';

const bb3Service = require("../../lib/bb3Service.js");

const express = require("express")
, dataService = require("../../lib/DataServiceBB3.js").rebbl3
, redraftService = require("../../lib/RedraftService.js")
, util = require("../../lib/util.js");

class Redraft{
	constructor(){
		this.router = express.Router();
	}

  #teamView = async (req,res) => {

    return res.render("bb3/redraft/index", {id:req.params.teamId});
  }

  #redraftPreview = async (req, res) => res.render("bb3/redraft/preview", {team: await redraftService.checkRedraft(req.params.teamId, res.locals.user)});

  #startRedraft = async (req,res) => {
    const result =  await redraftService.startRedraft(req.params.teamId, res.locals.user);

    if (result?.error) res.status(400).json(result);
    else res.json({redirect: `/bb3/redraft/${req.params.teamId}`});
  }

  #draftPlayer = async (req,res) =>  {
    try{
      const player = await redraftService.draftPlayer(req.params.teamId, req.params.playerId, res.locals.user);
      res.status(200).json(player);
    } catch (ex) {
      res.status(400).json(ex);
    }
  }
  #undraftPlayer = async (req,res) => {
    try{
      await redraftService.undraftPlayer(req.params.teamId, req.params.playerId, res.locals.user);
      res.status(200).json();
    } catch (ex) {
      res.status(400).json(ex);
    }
  }
  #updateImprovement = async (req,res) => {
    try{
      await redraftService.updateImprovement(req.params.teamId, {improvement:req.body.improvement, quantity:req.body.quantity}, res.locals.user);
      res.status(200).json();
    } catch (ex) {
      res.status(400).json(ex);
    }
  }
  #updatePosition = async (req,res) => {
    try{
      await redraftService.updatePosition(req.params.teamId, {id:req.body.id, quantity:req.body.quantity}, res.locals.user);
      res.status(200).json();
    } catch (ex) {
      res.status(400).json(ex);
    }
  }


  #teamData = async (req,res) => {
    const team = await dataService.getTeam({id: req.params.teamId});
    res.json(team.redraft);
  }


  routesConfig(){
    this.router.get("/:teamId/preview", util.cache(1), util.checkAuthenticated, this.#redraftPreview);
    this.router.get("/:teamId", util.cache(1), util.checkAuthenticated, this.#teamView);
    this.router.post("/:teamId", util.ensureAuthenticated, this.#startRedraft);
    
    this.router.post("/api/:teamId", util.ensureAuthenticated, this.#startRedraft);
    
    this.router.put("/api/:teamId/improvement", util.ensureAuthenticated, this.#updateImprovement);
    this.router.put("/api/:teamId/position", util.ensureAuthenticated, this.#updatePosition);
    this.router.put("/api/:teamId/:playerId", util.ensureAuthenticated, this.#draftPlayer);

    this.router.delete("/api/:teamId/:playerId", util.ensureAuthenticated, this.#undraftPlayer);

    this.router.get("/api/:teamId", util.cache(1),  this.#teamData);


    return this.router;
  }
}
module.exports = Redraft;
