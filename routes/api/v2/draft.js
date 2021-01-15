'use strict';
const express = require('express')
  , dataService = require("../../../lib/DataService.js").rebbl
  , draftService = require("../../../lib/DraftService.js")
  , logging = require("../../../lib/loggingService.js")
  , util = require('../../../lib/util.js');


class DraftApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }

  async getDraftData(req, res){
    var data = await draftService.getDraft(req.user.name, req.params.division, req.params.round, req.params.house);

    res.json(data);
  }

  async saveDraftData(req, res){
    try{
      await draftService.saveDraft(req.user.name, req.body);
      res.status(200).send();
    }
    catch(e){
      logging.error(e);
      res.status(400).send({message: e.message});
    }
  }

  async confirmDraftData(req, res){
    try{
      await draftService.confirmDraft(req.user.name, req.body);
      res.status(200).send();
    }
    catch(e){
      logging.error(e);
      res.status(400).send({message: e.message});
    }
  }

  async completeDraftProcess(req,res){

    const query = {
      house: Number(req.params.house),
      round: Number(req.params.round), 
      competition: req.params.division, 
      season: req.params.season
    };

    const draft = await dataService.getDraft(query);

    switch(req.params.part){
      case "powers":
        await draftService.registerPowers(draft);
        break;
      case "matches":
        const unstarted = await draftService.createGames(draft,data);

        dataService.updateSchedule(query, {$set:{unstarted: unstarted, drafted:true}});
        break;
      case "post":
        await draftService.postToReddit(draft);
        break;
    }

  }

  routesConfig(){
    this.router.get("/:division/:round/:house", util.ensureAuthenticated, this.getDraftData);

    this.router.put("/:season/:division/:round/:house/:part", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), this.completeDraftProcess);

    this.router.get("/", util.ensureAuthenticated, this.getDraftData);
 
    this.router.post("/", util.ensureAuthenticated, util.hasRole("clanleader"), this.saveDraftData);

    this.router.put("/", util.ensureAuthenticated, util.hasRole("clanleader"), this.confirmDraftData);

    return this.router;
  }
}

module.exports = DraftApi;