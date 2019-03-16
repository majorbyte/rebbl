'use strict';
const  coach = require(`./coach.js`)
  , division = require(`./division.js`)
  , express = require('express')
  , league =require(`./league.js`)  ;



class Rebbl{
	constructor(){
		this.router = express.Router();
	}


  routesConfig(){
    this.router.get('/rebbl', function (req, res, next) {
      res.redirect('coach');
    });
    
    this.router.use('/match', require(`./match.js`));
    this.router.use('/coach', new coach().routesConfig());
    this.router.use('/stunty', require(`./stunty.js`));
    this.router.use('/upcoming', require(`./upcoming.js`));
    this.router.use('/team', require(`./team.js`));
    this.router.use('/old_team', require(`./old_team.js`));
    this.router.use('/playoffs', require(`./playoffs.js`));
    this.router.use('/:league', new league().routesConfig());
    this.router.use('/:league/:division', new division().routesConfig());

    return this.router;
  }
}

module.exports = Rebbl;