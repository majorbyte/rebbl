'use strict';
const express = require('express')
  , util = require('../../lib/util.js');


class Standings{
	constructor(){
		this.router = express.Router({mergeParams:true});
	}


  routesConfig(){
    this.router.get('/:league', util.cache(1), async function(req, res){
      let data = {company:req.params.company};
      if(data.company ==="hjmc")
        res.render('rebbl/standings/hjmc', data);
      if(req.params.league === "Rebbl One Minute League")
        res.render('rebbl/standings/hjmc', data);
      else
        res.render('rebbl/standings/index', data);
    });
    return this.router;
  }
}  

module.exports = Standings;