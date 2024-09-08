'use strict';

const express = require("express")
, dataService = require("../../lib/DataServiceBB3.js").rebbl3
, util = require("../../lib/util.js");

class ZFL{
	constructor(){
		this.router = express.Router();
	}


  routesConfig(){
    this.router.get("/", util.cache(1), async (req,res) => res.render("zfl/teams" , {teams:await dataService.getZFLTeams({})} ) );
    this.router.get('/:id', util.cache(1), async (req,res) => res.render("zfl/team" , {team:await dataService.getZFLTeam({id:req.params.id}) }) );

    return this.router;
  }
}
module.exports = ZFL;
