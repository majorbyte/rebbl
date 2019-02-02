"use strict";

const Datastore = require('./async-nedb.js')
  , async = require('async');

class TrophyService{
  constructor() {
    this.trophies = new Datastore.datastore('datastore/trophies.db');
    this.trophies.loadDatabase();
  }

  async getTrophy (name) { 
    return await this.trophies.findOne({name:name});
  }  

  async getTrophies () { 
    return await this.trophies.find({});
  }  

  async update(name, item){
    await this.trophies.update({"name":name},item,{upsert:true});
  }

  async delete(item){
    await this.trophies.remove(item);
  }

}


module.exports = new TrophyService();