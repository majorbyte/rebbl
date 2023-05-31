'use strict';

const express = require('express')
  , configurationService = require("../../../../lib/ConfigurationService.js")
  , cyanideService = require("../../../../lib/CyanideService.js")
  , leagueService = require("../../../../lib/LeagueService.js")
  , util = require('../../../../lib/util.js')
  , router = express.Router();

router.get("/test", util.ensureAuthenticated, util.hasRole("admin"), async function(req,res){
    res.json(await cyanideService.endpoints());
});

router.get("/syncState", util.ensureAuthenticated, util.hasRole("admin"), async function(req,res){
    res.json(req.app.locals.cyanideEnabled);
});
router.post("/enableSync", util.ensureAuthenticated, util.hasRole("admin"), async function(req,res){
    req.app.locals.cyanideEnabled = true;
    res.status(200).send();
});
router.post("/disableSync", util.ensureAuthenticated, util.hasRole("admin"), async function(req,res){
    req.app.locals.cyanideEnabled = false;
    res.status(200).send();
});


router.get('/reload', util.ensureAuthenticated, util.hasRole("superadmin"), async function(req, res){
    try{

        await configurationService.init();

        res.status(200).send();
    } catch(err){
        console.log(err);
    }
});


module.exports = router;