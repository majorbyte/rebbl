"use strict";

const express = require("express")
  , api = require("../../../../lib/apiService.js")
  , config = require("../../../../lib/ConfigurationService.js")
  , dataService = require("../../../../lib/DataService.js").rebbl
  , util = require("../../../../lib/util.js")
  , router = express.Router();

  router.get("/", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      let leagues = config.getSeasons();
      let data = [];
  
      leagues.map(league => league.leagues.filter(l => l.id))
        .filter(x => x.length > 0)
        .map(x => data = data.concat(x));
  
      res.status(200).send(data);
    } catch(err){
      console.log(err);
    }
  });


  router.get("/:leagueId", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      let info = await api.getBoardInfo(Number(req.params.leagueId));

      if (info.ResponseGetLeagueBoard.CallResult.Result === "1"){
        let data = info.ResponseGetLeagueBoard.BoardMembers.BoardMember.map(member => {
          return {
            coachId: member.IdCoach,
            coachName: member.NameCoach,
            type: member.RowBoard.IdProfileType,
            leagueName: member.RowLeague.Name,
            boardId: member.RowBoard.Id.Value
          };
        });
        res.status(200).send(data);
      } else {
        res.status(500).send(info.ResponseGetLeagueBoard.CallResult);
      }
    } catch(err){
      console.log(err);
    }
  });

  router.post("/:leagueId", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      let data = await api.addBoardMember(Number(req.params.leagueId), req.body.coachName, Number(req.body.coachId), req.body.type);
      if(data.ResponseSetBoardMember.CallResult.Result === "1"){
        dataService.insertModerationEntry({
          user: req.user.name,
          action:"Add boardmember",
          data: JSON.stringify({leagueId: req.params.leagueId, coachId: req.body.coachId, coachName:req.body.coachName, type:req.body.type}),
          date: new Date(Date.now()),
          state:"success"
        });
        res.status(200).send(data);
      } else {
        dataService.insertModerationEntry({
          user: req.user.name,
          action:"Add boardmember",
          data: JSON.stringify({leagueId: req.params.leagueId, coachId: req.body.coachId, coachName:req.body.coachName, type:req.body.type}),
          date: new Date(Date.now()),
          state:data.ResponseSetBoardMember.CallResult.Message
        });
        res.status(500).send(data.ResponseSetBoardMember.CallResult);
      }

    } catch(err){
      console.log(err);
    }
  });


  router.get("/search/:coachName", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      let data = await api.searchCoach(req.params.coachName);

      res.status(200).send(data.ResponseSearchCoach.Coaches.DataUser);
    } catch(err){
      console.log(err);
    }
  });

  router.delete("/:id", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      let data = await api.removeBoardMember(req.params.id);

      if(data.ResponseRemoveBoardMember.CallResult.Result === "1"){
        dataService.insertModerationEntry({
          user: req.user.name,
          action:"Remove boardmember",
          data: JSON.stringify({id: req.params.id}),
          date: new Date(Date.now()),
          state:"succes"
        });
        res.status(200).send(data);
      } else{
        dataService.insertModerationEntry({
          user: req.user.name,
          action:"Remove boardmember",
          data: JSON.stringify({id: req.params.id}),
          date: new Date(Date.now()),
          state:data.ResponseSetBoardMember.CallResult.Message
        });
        res.status(500).send(data.ResponseRemoveBoardMember.CallResult);
      }
    } catch(err){
      console.log(err);
    }
  });


module.exports = router;