'use strict';
const express = require('express')
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
      res.statusMessage = e.message;
      res.status(400).end();
    }
  }

  async confirmDraftData(req, res){
    try{
      await draftService.confirmDraft(req.user.name, req.body);
      res.status(200).send();
    }
    catch(e){
      logging.error(e);
      res.statusMessage = e.message;
      res.status(400).end();
    }
  }

  routesConfig(){
    this.router.get("/:division/:round/:house", util.ensureAuthenticated, this.getDraftData);
    this.router.get("/", util.ensureAuthenticated, this.getDraftData);
 
    this.router.post("/", util.ensureAuthenticated, util.hasRole("clanleader"), this.saveDraftData);

    this.router.put("/", util.ensureAuthenticated, util.hasRole("clanleader"), this.confirmDraftData);

    return this.router;
  }
}

module.exports = DraftApi;