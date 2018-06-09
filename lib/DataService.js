"use strict";

const Datastore = require('./async-nedb.js');

class DataService {
  constructor() {
    this.config = new Datastore.datastore('datastore/config.db');

    this.config.loadDatabase().catch((err) => console.log(err));
    let data = this.config.find({});
    this.seasons = data.seasons;
  }

  getSeasons = () => this.seasons;

  getDefaultSeason = () => this.seasons.find((s) => s.default === true )
}

module.exports = new DataService();