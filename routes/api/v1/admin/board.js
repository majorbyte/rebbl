"use strict";

const express = require("express")
  , api = require("../../../../lib/apiService.js")
  , config = require("../../../../lib/ConfigurationService.js")
  , dataService = require("../../../../lib/DataService.js").rebbl
  , util = require("../../../../lib/util.js")
  , router = express.Router();

  router.get("/", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      const coach = await api.getCoachInfo(307300);

    

      
      let data = [];
  
      coach.ResponseGetCoachOverview.BoardMemberships.BoardMember.map(member => data.push({
        id:Number(member.RowLeague.Id.Value.replace(/\D/g,"")),
        description:member.RowLeague.Description,
        flags:member.RowLeague.Flags,
        logo:member.RowLeague.Logo,
        name:member.RowLeague.Name,
        teams: member.RowLeague.NbRegisteredTeams,
        website:member.RowLeague.Websites
      }));
    
      data = data.sort((a,b) => a.name > b.name ? 1 : -1);
      
      const excludeLeagues = [55861, 64853, 68241, 68663];
      excludeLeagues.map(ex => data.splice(data.findIndex(x => x.id === ex ),1));

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

        data.splice(data.findIndex(x=>x.coachId === "307300"),1);

        res.status(200).json(data);
      } else {
        res.status(500).json(info.ResponseGetLeagueBoard.CallResult);
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
        res.status(200).json(data);
      } else {
        dataService.insertModerationEntry({
          user: req.user.name,
          action:"Add boardmember",
          data: JSON.stringify({leagueId: req.params.leagueId, coachId: req.body.coachId, coachName:req.body.coachName, type:req.body.type}),
          date: new Date(Date.now()),
          state:data.ResponseSetBoardMember.CallResult.Message
        });
        res.status(500).json(data.ResponseSetBoardMember.CallResult);
      }

    } catch(err){
      console.log(err);
    }
  });


  router.get("/search/:coachName", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      
      let data = await api.searchCoach(req.params.coachName);

      res.status(200).json(data.ResponseSearchCoach.Coaches.DataUser);
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
        res.status(200).json(data);
      } else{
        dataService.insertModerationEntry({
          user: req.user.name,
          action:"Remove boardmember",
          data: JSON.stringify({id: req.params.id}),
          date: new Date(Date.now()),
          state:data.ResponseSetBoardMember.CallResult.Message
        });
        res.status(500).json(data.ResponseRemoveBoardMember.CallResult);
      }
    } catch(err){
      console.log(err);
    }
  });


module.exports = router;