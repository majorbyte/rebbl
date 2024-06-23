'use strict';
const express = require('express')
  , dataService = require("../../../lib/DataService.js").rebbl
  , util = require('../../../lib/util.js');


class HooksApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }

  async createHook(req,res){
    try {
      const hook =    {   
        url:req.body.url,
        race:req.body.race || [],
        competition:req.body.competition || [],
        owner:req.user.name
      } 
  
      await dataService.insertHook(hook);
  
      res.json({});
    }
    catch (e){
      res.status(400).send({message: e.message});
    }
  }

  async updateHook(req,res){
    try {
      const hook =  await dataService.getHook({url:req.body.url, owner:req.user.name});

      hook.race = req.body.race || hook.race;
      hook.competition = req.body.competition || hook.competition;

      dataService.updateHook({_id:hook._id},{$set:{race:hook.race, competition:hook.competition}});
  
      res.json({});
    }
    catch (e){
      res.status(400).json({message: e.message});
    }
  }

  async deleteHook(req,res){
    try{
      await dataService.deleteHook({owner:req.user.name,url:req.body.url});
      res.json({});
    }
    catch (e){
      res.status(400).json({message: e.message});
    }
  }

  routesConfig(){
    this.router.get("/", util.ensureAuthenticated, async(req,res) => res.json(await dataService.getHooks({owner:req.user.name})));
    this.router.post("/", util.ensureAuthenticated, this.createHook);
    this.router.put("/", util.ensureAuthenticated, this.updateHook);
    this.router.delete("/", util.ensureAuthenticated, this.deleteHook);

    return this.router;
  }
}

module.exports = HooksApi;