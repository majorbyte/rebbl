'use strict';

const  express = require('express')
  , util = require('../../lib/util.js');

class BloodBowl{
	constructor(){
		this.router = express.Router();
	}


  routesConfig(){
    this.router.get('/starplayers',/*util.checkCache,*/function(req, res){res.render('bloodbowl/starplayers');});
    this.router.get('/legendaryplayers',/*util.checkCache,*/function(req, res){res.render('bloodbowl/legendaryplayers');});

    return this.router;
  }
}

module.exports = BloodBowl;