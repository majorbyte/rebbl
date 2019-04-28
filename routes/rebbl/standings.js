'use strict';
const express = require('express')
  , util = require('../../lib/util.js');


class Standings{
	constructor(){
		this.router = express.Router({mergeParams:true});
	}


  routesConfig(){
    this.router.get('/:league', util.checkCache, async function(req, res){
      res.render('rebbl/standings/index');
    });
    return this.router;
  }
}  

module.exports = Standings;