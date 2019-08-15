"use strict";

const express = require("express")
  , api = require("../../../../lib/apiService.js")
  , dataService = require("../../../../lib/DataService").rebbl
  , util = require("../../../../lib/util.js")
  , router = express.Router();



  router.get("/", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      let data = await dataService.getSchedules({season:"season 12", round:1, league:{$in:["REBBL - GMan","REBBL - Big O", "REBBL - REL"]}},{projection:{_id: 0,league:1, competition:1, competition_id:1}});

      let temp = [...new Set(data.map(x=> x.competition_id))];
      data = temp.map(x => data.find(d => d.competition_id === x));

      res.status(200).send(data);
    } catch(err){
      console.log(err); 
    }
  });

  router.get("/:competitionId", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      let contests = await dataService.getSchedules({competition_id: Number(req.params.competitionId), round:1});

      let data = [];
      contests.map(x => {
        if(x.opponents[0].team.name.toLowerCase().indexOf("[admin]")> -1 ) data.push({team:x.opponents[0].team.name, id:x.opponents[0].team.id })
        if(x.opponents[1].team.name.toLowerCase().indexOf("[admin]")> -1 ) data.push({team:x.opponents[1].team.name, id:x.opponents[1].team.id })
      })

      res.status(200).send(data);
    } catch(err){
      console.log(err);
    }
  });
  
  router.delete("/:competitionId/:teamId", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      let result = await api.expel(Number(req.params.competitionId), Number(req.params.teamId));

      res.status(200).send(result);
    } catch(err){
      console.log(err);
    }
  });



module.exports = router;