'use strict';
const express = require("express");

class Api{
	constructor(Router){
		this.router = express.Router();
	}


  
  routesConfig(){
    this.router.use('/v1', require(`./v1/api.js`));

    this.router.use('/v2', require(`./v2/api.js`));

    return this.router
  }
} 


module.exports = Api;