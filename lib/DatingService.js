"use strict";

const Datastore = require('./async-nedb.js')
  , cache = require('memory-cache');


class DatingService{
  constructor(){
    this.dates = new Datastore.datastore('datastore/match-dates.db');

    this.dates.loadDatabase();
  }

  async getDate (contestId) { 
    return await this.dates.findOne({id:contestId})
  }


  async updateDate(contestId, date){
    await this.dates.update({"id":contestId},{"id":contestId, "date":date},{upsert:true});
    cache.del("/api/v1/upcoming");
  }

  async update(contestId, item){
    await this.dates.update({"id":contestId},item,{upsert:true});
    cache.del("/api/v1/upcoming");
  }

  async search(param){
    return await this.dates.find(param);
  }

  async removeDate(contestId){
    await this.dates.remove({id:contestId});
    cache.del("/api/v1/upcoming");
  }

  async all(){
    return await this.dates.find({});
  }

}

module.exports = new DatingService();