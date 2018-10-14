'use strict';

const express = require('express')
  , leagueService = require("../../../../lib/LeagueService.js")
  , util = require('../../../../lib/util.js')
  , router = express.Router();



router.get('/leagues', util.ensureAuthenticated, util.hasRole("superadmin"), async function(req, res){
    try{

        let data = await leagueService.getLeagues({round: {$gt:-1}}) 

        res.status(200).send([...new Set(data.map(item => item.league))]);
    } catch(err){
        console.log(err);
    }
});

router.get('/competitions/:league', util.ensureAuthenticated, util.hasRole("superadmin"), async function(req, res){
    try{

        let data = await leagueService.getLeagues({"league":req.params.league,round: {$gt:-1}}) 

        res.status(200).send([...new Set(data.map(item => item.competition))]);
    } catch(err){
        console.log(err);
    }
});

router.get('/contests/:league/:competition', util.ensureAuthenticated, util.hasRole("superadmin"), async function(req, res){
    try{

        let data = await leagueService.getLeagues({"league":req.params.league,"competition":req.params.competition, round: {$gt:-1}}) 

        res.status(200).send(data);
    } catch(err){
        console.log(err);
    }
});

router.post("/",  util.ensureAuthenticated, util.hasRole("superadmin"), async function(req, res){
    try{

        let data = req.body;
        let id = data._id;
        delete data._id;

        data.manual=true;
        leagueService.updateContest({"_id":id}, data);

        res.status(200).send("ok");
    } catch(err){
        console.log(err);
        res.status(500).send(err);
    }
});


module.exports = router;