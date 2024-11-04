'use strict';
const configuration = require('../../lib/ConfigurationService.js')
  , db = require('../../lib/LeagueService.js')
  , express = require('express')
  , util = require('../../lib/util.js');


class League{
	constructor(){
		this.router = express.Router({mergeParams:true});
	}


  routesConfig(){
    this.router.get('/', util.cache(10*60), async function(req, res){
      let data = {standings:null, rounds:null, league:req.params.league,company:req.params.company };
      let comp = false;
      let league = req.params.league.toLowerCase();

      switch(league){
        case "big o":
          res.redirect(`/rebbl/standings/REBBL - Big O`);
          return;
        case "gman":
          res.redirect(`/rebbl/standings/REBBL - GMan`);
          return;
        case "rel":
          res.redirect(`/rebbl/standings/REBBL - REL`);
          return;
        case "rebbrl upstarts":
          res.redirect(`/rebbrl/standings/ReBBRL Upstarts`);
          return;
        case "rebbrl minors league":
          res.redirect(`/rebbrl/standings/ReBBRL Minors League`);
          return;
        case "rebbrl college league":
          res.redirect(`/rebbrl/standings/ReBBRL College League`);
          return;
        case "rebbl one minute league":
          res.redirect(`/rebbl/standings/[REBBL] One Minute League`);
          return;
      }
      let season = "";
      if(league.toLowerCase() === "greenhorn cup") {
        league = new RegExp(`^Greenhorn Cup`,'i');
        comp ="Greenhorn Cup$";
        season ="season 25";
      } else if (league.toLowerCase().indexOf("rebbrl") === -1 && league.toLowerCase() !== "rebbll" && league.toLowerCase() !== "rebbll " && league.toLowerCase() !== "xscessively elfly league" && league.toLowerCase() !== "rabble" && league.toLowerCase() !== "eurogamer" ){
        try{
          league = new RegExp(`^REBBL[\\s-]+${league}`, 'i');
        }
        catch (ex){
          res.status(500).render('5xx');
          return;
        }
      }  
      else {
        try{
          league = new RegExp(`^${league}`, 'i');
        }
        catch (ex){
          res.status(500).render('5xx');
          return;
        }
      }
    
      
      data.cutoffs = configuration.getPlayoffTickets(req.params.league);
      data.standings = await db.getCoachScore(league, comp || null, true,season);
      data.rounds = await db.getDivisions(league);
      res.render('rebbl/league/index', data);
    
    });
    return this.router;
  }
}  

module.exports = League;