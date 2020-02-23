'use strict';
const express = require("express")
  , apiV1 = require("./v1/api.js")
  , apiV2 = require("./v2/api.js");

class Api{
	constructor(){
		this.router = express.Router();
	}
  
  routesConfig(){
    this.router.use('/v1', new apiV1().routesConfig());
    this.router.use('/v2', new apiV2().routesConfig());

    return this.router;
  }
} 

module.exports = Api;