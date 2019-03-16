'use strict';
 const express = require('express');

class Cripple{
	constructor(){
		this.router = express.Router();
	}


  
  routesConfig(){
    this.router.use('/counter', require(`./counter.js`));

    this.router.use('/match', require(`./match.js`));
    
    this.router.use('/standings', require(`./standings.js`));
    
    return this.router
  }
} 
module.exports = Cripple;