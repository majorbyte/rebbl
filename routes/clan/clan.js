'use strict';

const express = require("express")
, util = require("../../lib/util.js");

class Clan{
	constructor(){
		this.router = express.Router();
	}



  async _root(req,res,next){
    res.render("clan/index", {data:null});
  }
  async clan(req,res,next){
    res.render("clan/clan", {data:null});
  }

  routesConfig(){

    this.router.get("/clan",util.cache(2), this.clan)
    this.router.get("/clan/:clan",util.cache(2), this.clan)
    
    this.router.get("/", util.cache(2), this._root);

    return this.router;

  }

}



module.exports = Clan;