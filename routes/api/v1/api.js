'use strict';

const express = require('express');

class ApiV1{
  constructor(){
    this.router = express.Router();
  }

  routesConfig(){
    this.router.use('/standings', require(`./standings.js`));
    this.router.use('/greenhorn', require(`./greenhorn.js`));
    this.router.use('/oi', require(`./oi.js`));
    this.router.use('/signups', require(`./signups.js`));
    this.router.use('/upcoming', require(`./upcoming.js`));
    this.router.use('/admin', require(`./admin/admin.js`));
    this.router.use('/playoffs', require('./playoffs.js'));
    
    return this.router;
  }
}

module.exports = ApiV1;