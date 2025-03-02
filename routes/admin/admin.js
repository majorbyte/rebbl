'use strict';

const express = require("express");

class Admin{
	constructor(){
		this.router = express.Router();
	}


  routesConfig(){
    this.router.get('/', async function(req, res){
      res.redirect("/admin/user");
    });

    this.router.use('/user', require(`./user.js`));
    this.router.use('/strikes', require(`./strikes.js`));
    this.router.use('/competition', require(`./competition.js`));
    this.router.use('/contest', require(`./contest.js`));
    this.router.use('/unplayed', require(`./unplayed.js`));
    this.router.use('/trophies', require(`./trophies.js`));
    this.router.use('/divisions', require(`./divisions.js`));
    this.router.use('/board', require(`./board.js`));
    this.router.use('/clan', require(`./clan.js`));
    this.router.use('/templates', require('./templates.js'));
    
    this.router.use('/rampup', (req, res) => res.render("admin/rampup/index"));


    return this.router;

  }

}



module.exports = Admin;