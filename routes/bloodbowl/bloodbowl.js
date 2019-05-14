'use strict';

const  express = require('express')
  , util = require('../../lib/util.js');

class BloodBowl{
	constructor(){
		this.router = express.Router();
	}


  routesConfig(){
    this.router.get('/starplayers',/*util.checkCache,*/function(req, res){res.render('bloodbowl/starplayers');});

    return this.router;
  }
}

module.exports = BloodBowl;