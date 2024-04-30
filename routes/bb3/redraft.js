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

  teamView = async (req,res) => {

    return res.render("bb3/redraft/index", {id:req.params.teamId});
  }

  startRedraft = async (req,res) => {
    const result =  await redraftService.startRedraft(req.params.teamId, res.locals.user);

    if (result?.error) res.status(400).json(result);
    else res.json({redirect: `/bb3/redraft/${req.params.teamId}`});
  }

  teamData = async (req,res) => {
    
    const team = await dataService.getTeam({id: req.params.teamId});
    const retiredPlayers = await dataService.getRetiredPlayers({teamId:req.params.teamId});
    const positions = await dataService.getPositions();
    const races = await dataService.getRaces();

    const race = races.find(x => x.code == team.race);

    const allowedPositions = positions.filter(x => x.race === race.prefix);

    res.json({team:team.redraft, retiredPlayers, allowedPositions});
  }

  routesConfig(){
    this.router.get("/:teamId", util.cache(1), util.checkAuthenticated, this.teamView);
    
    this.router.post("/api/:teamId", util.ensureAuthenticated, this.startRedraft)

    this.router.get("/api/:teamId", util.cache(1),  this.teamData);


    return this.router;
  }
}
module.exports = Redraft;
