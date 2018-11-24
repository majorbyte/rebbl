'use strict';

const express = require('express')
  , redditService = require("../../../../lib/RedditService.js")
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
  

module.exports = router;