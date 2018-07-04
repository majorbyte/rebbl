"use strict";

const Datastore = require('nedb');

class ConfigurationService {
  constructor() {
    this.config = new Datastore({filename:'datastore/config.json'});

    this.config.loadDatabase();
    this.config.findOne({}, function(err,doc){
      this.seasons = doc.seasons;
    }.bind(this));
    
  }

  getSeasons () {return this.seasons};

  getActiveSeason () {return this.seasons.find((s) => s.active === true )}
}

module.exports = new ConfigurationService();