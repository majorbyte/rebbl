"use strict";

const dataService = require("./DataService.js").rebbl
  , cache = require('memory-cache');


class DatingService{
  constructor(){
  }

  async getDate (contestId) { 
    return await dataService.getMatchDate({id:contestId});
  }


  _clearCache(contestId){
    cache.del("/api/v1/upcoming");
    cache.del(`/rebbl/match/unplayed/${contestId}`);
  }

  updateDate(contestId, date){
    dataService.updateMatchDate({"id":contestId},{"id":contestId, "date":date},{upsert:true});
    this._clearCache(contestId);
  }


  update(contestId, item, options){
    dataService.updateMatchDate({"id":contestId},item,options);
    this._clearCache(contestId);
  }

  async search(param){
    return await dataService.getMatchDates(param);
  }

  removeDate(contestId){
    dataService.removeMatchDate({id:contestId});
    this._clearCache(contestId);
  }

  async all(){
    return await dataService.getMatchDates({});
  }
}

module.exports = new DatingService();