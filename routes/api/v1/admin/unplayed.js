'use strict';

const express = require('express')
  , redditService = require("../../../../lib/RedditService.js")
  , maintenanceService = require("../../../../lib/MaintenanceService.js")
  , util = require('../../../../lib/util.js')
  , router = express.Router();



  router.get('/', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      let data = await redditService.getUnplayedGames();

      res.status(200).send(data);
    } catch(err){
      console.log(err);
    }
  });
  
  router.post('/:contest_id', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
  
      await maintenanceService.fixAdminGames(req.params.contest_id);

      res.status(200).send("ok");
    } catch(err){
      console.log(err);
    }
  });



module.exports = router;