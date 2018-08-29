"use strict";

const Datastore = require('./async-nedb.js')
  , cache = require('memory-cache');


class DatingService{
  constructor(){
    this.dates = new Datastore.datastore('datastore/match-dates.db');

    this.dates.loadDatabase();
  }

  async getDate (contestId) { 
    let item = await this.dates.findOne({id:contestId})
    return item ? item.date : null;
  }

  async updateDate(contestId, date){
    await this.dates.update({id:contestId},{"id":contestId, "date":date},{upsert:true});
    cache.del("/api/v1/upcoming");
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