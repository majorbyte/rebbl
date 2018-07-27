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

  getPlayoffTickets (league) {
    league = league.toLowerCase();
    let ret = [];
    this.seasons.map(function(season){
      console.dir(season);
      let l = season.leagues.find((a) => a.link.toLowerCase() === league );
      if (l) {
        ret.push({
          name : season.name,
          cutoff: l.playoffs
        });
      }
    })
    return ret;
  }
}

module.exports = new ConfigurationService();