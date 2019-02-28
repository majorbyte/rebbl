"use strict";

const dataService = require("./DataService.js").rebbl
  , cache = require('memory-cache');


class DatingService{
  constructor(){
  }

  async getDate (contestId) { 
    return await dataService.getMatchDate({id:contestId})
  }


  _clearCache(contestId){
    cache.del("/api/v1/upcoming");
    cache.del(`/rebbl/match/unplayed/${contestId}`);
  }

  async updateDate(contestId, date){
    await dataService.updateMatchDate({"id":contestId},{"id":contestId, "date":date},{upsert:true});
    this._clearCache(contestId);
  }

  async update(contestId, item){
    await dataService.updateMatchDate({"id":contestId},item,{upsert:true});
    this._clearCache(contestId);
  }

  async search(param){
    return await dataService.getMatchDates(param);
  }

  async removeDate(contestId){
    await this.dates.remove({id:contestId});
    this._clearCache(contestId);
  }

  async all(){
    return await dataService.getMatchDates({});
  }

}

module.exports = new DatingService();