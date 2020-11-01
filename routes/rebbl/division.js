'use strict';
const db = require('../../lib/LeagueService.js')
  , express = require('express')
  , util = require('../../lib/util.js')
  , datingService = require("../../lib/DatingService.js");

class Division{
	constructor(){
		this.router = express.Router({mergeParams:true});
	}



  routesConfig(){
    this.router.get('/', util.cache(10*60), this._division);
    this.router.get('/:week', util.cache(10*60), this._week);
    return this.router;
  }

  async _division(req,res) {
    let data = {matches: null, divisions: null, league: req.params.league, competition: req.params.division,company:req.params.company};
    
    let leagueRegex;
    let league = req.params.league;
    let divRegex = new RegExp(`^${req.params.division}$`, 'i');
    let season = "";
    if(league.toLowerCase() === "off season international"){
      leagueRegex = new RegExp(`^ReBBL Open Invitational`, 'i');
      season = "season 15";
    } else if(league.toLowerCase() === "rebbl one minute league"){
      leagueRegex = new RegExp(`^Rebbl One Minute League`, 'i');  
    } else if(league.toLowerCase() === "greenhorn cup") {
      leagueRegex = new RegExp(`^Greenhorn Cup`,'i');
      season = "season 15";
      divRegex =new RegExp(`^${req.params.division}$`, 'i');
    } else if (league.toLowerCase().indexOf("hjmc") === -1 && league.toLowerCase().indexOf("rebbrl") === -1 && league.toLowerCase().indexOf("rebbl -") === -1 && league.toLowerCase() !== "rebbll" && league.toLowerCase() !== "rebbll " && league.toLowerCase() !== "xscessively elfly league" && league.toLowerCase() !== "rabble" && league.toLowerCase() !== "eurogamer"){
      leagueRegex = new RegExp(`REBBL[\\s-]+${req.params.league}`, 'i');
    } else {
      if (league === "rabble"){
        league = "the rebbl rabble mixer";
      }
      if (league === "eurogamer"){
        league = "REBBL Eurogamer Open";
      }
      leagueRegex = new RegExp(`^${league}`, 'i');
    }
  
    
    if( req.params.league.toLowerCase() === "rampup"){
      leagueRegex = new RegExp(`${league}$`, 'i');
      divRegex = new RegExp(`^${req.params.division}`, 'i');
      season = "season 15";
    } 
    
    if (season !== "")
      data.matches = await db.getLeagues({league: {"$regex": leagueRegex}, competition: {"$regex": divRegex}, season:season});
    else 
      data.matches = await db.getLeagues({league: {"$regex": leagueRegex}, competition: {"$regex": divRegex}});

    let ids = [];
    for(var prop in data.matches){
      data.matches[prop].map(m => ids.push(m.contest_id));
    }
  
    data.dates = await datingService.search({"id":{$in:ids}});
  
    if(league.toLowerCase() === "xscessively elfly league"){
      data.matches["1"] = await data.matches["1"].sort(function(a,b){
        return a.match_id > b.match_id ? -1 : 1;
      });
    }
  
    res.render('rebbl/division/index', data);
  }

  async _week(req,res) {
    let week = parseInt(req.params.week);
  
    if (week > 0){
      let data = {matches:null, divisions:null, league:req.params.league, competition: req.params.division, week: week,company:req.params.company };
      let leagueRegex;
      let league = req.params.league;
      let season = "";
      if(league.toLowerCase() === "off season international"){
        leagueRegex = new RegExp(`^ReBBL Open Invitational`, 'i');
        season = "season 15";
      } else if(league.toLowerCase() === "rebbl one minute league"){
        leagueRegex = new RegExp(`^Rebbl One Minute League`, 'i');  
      } else if(league.toLowerCase() === "greenhorn cup") {
        leagueRegex = new RegExp(`^Greenhorn Cup`,'i');
        season = "season 15";
        divRegex =new RegExp(`^${req.params.division}$`, 'i');
      } else if (league.toLowerCase().indexOf("rebbrl") === -1 && league.toLowerCase().indexOf("rebbl -") === -1 && league.toLowerCase() !== "greenhorn cup" && league.toLowerCase() !== "rebbll" && league.toLowerCase() !== "rebbll " && league.toLowerCase() !== "xscessively elfly league" && league.toLowerCase() !== "rabble" && league.toLowerCase() !== "eurogamer"){
        leagueRegex = new RegExp(`REBBL[\\s-]+${req.params.league}`, 'i');
      } else {
        if (league === "rabble"){
          league = "the rebbl rabble mixer";
        }
        if (league === "eurogamer"){
          league = "REBBL Eurogamer Open";
        }
          leagueRegex = new RegExp(`^${league}`, 'i');
      }
        
      let divRegex = new RegExp(`^${req.params.division}$`, 'i');

      if( req.params.league.toLowerCase() === "rampup"){
        leagueRegex = new RegExp(`${league}$`, 'i');
        divRegex = new RegExp(`^${req.params.division}`, 'i');
        season = "season 15";
      }

      if(season !== "")
        data.matches = await db.getLeagues({round: week, league: {"$regex": leagueRegex}, competition: {"$regex": divRegex},season:season});
      else
        data.matches = await db.getLeagues({round: week, league: {"$regex": leagueRegex}, competition: {"$regex": divRegex}});
  
      let ids = [];
      data.matches.map(m => ids.push(m.contest_id));
    
      data.dates = await datingService.search({"id":{$in:ids}});
    
      data.weeks = await db.getWeeks(leagueRegex, divRegex);
  
      res.render('rebbl/division/round', data);
    } else {
      res.redirect(`/rebbl/${req.params.league}`);
    }
  }
}


module.exports = Division;