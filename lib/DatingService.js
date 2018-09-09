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


  _clearCache(contestId){
    cache.del("/api/v1/upcoming");
    cache.del(`/rebbl/match/unplayed/${contestId}`);
  }

  async updateDate(contestId, date){
    await this.dates.update({"id":contestId},{"id":contestId, "date":date},{upsert:true});
    this._clearCache(contestId);
  }

  async update(contestId, item){
    await this.dates.update({"id":contestId},item,{upsert:true});
    this._clearCache(contestId);
  }

  async search(param){
    return await this.dates.find(param);
  }

  async removeDate(contestId){
    await this.dates.remove({id:contestId});
    this._clearCache(contestId);
  }

  async all(){
    return await this.dates.find({});
  }

}

module.exports = new DatingService();