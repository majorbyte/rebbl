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

  teamData = async (req,res) => {
    
    const team = await redraftService.getRedraftTeam(req.params.teamId);
    const retiredPlayers = await dataService.getRetiredPlayers({teamId:req.params.teamId});
    const positions = await dataService.getPositions();
    const races = await dataService.getRaces();

    const race = races.find(x => x.code == team.race);

    const allowedPositions = positions.filter(x => x.race === race.prefix);
    delete team.matches;
    delete team.primaryColor;
    delete team.secondaryColor;
    delete team.tertiaryColor;
    delete team.jerseyPattern;
    team.roster.forEach(player => {
      delete player.equipmentIds;
    });

    res.json({team, retiredPlayers, allowedPositions});
  }

  routesConfig(){
    this.router.get("/:teamId", util.cache(1), util.checkAuthenticated, this.teamView);
    
    this.router.get("/api/:teamId", util.cache(1),  this.teamData);

    return this.router;
  }
}
module.exports = Redraft;
