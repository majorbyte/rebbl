"use strict";
const 
  config = require('../../lib/ConfigurationService.js')
  , dataService = require("../../lib/DataService.js").rebbl
  , express = require("express");


class TextRoutes{
	constructor(){
		this.router = express.Router({mergeParams:true});
    this.pages = [];
	}

  async _main(req, res){
    if (this.pages.length === 0) this._loadPages();
  }

  _loadPages(){
    const seasons = config.getActiveSeason();
    const leagues = seasons.leagues.filter(x => x.divisions.length > 0).sort((a,b) => a.name > b.name ? 1 : -1);

    let pageCount = 210;
    for(const league of leagues){
      
      const page = {number:pageCount, league:league.name, season:seasons.name, pages:[]};
      pageCount++;
      for(const division of league.divisions){
        page.pages.push({number:pageCount, league:league.name, division: division, season:seasons.name});
        pageCount++;
      }
      this.pages.push(page);
      this.pages = this.pages.concat(page.pages);

      while(pageCount%10 !== 0) pageCount++;
    }
  }

  async _number(req,res){
    if (this.pages.length === 0) this._loadPages();
    const number = Number(req.params.number);
    
    if (number > 200){
      let page = this.pages.find(x => x.number === number);
      if (!page) page = this.pages.find(x => x.number > number);
      let data = {league:page.league, competition:page.division, season:page.season};
      data.tickets = config.getCompetitionTickets(page.league, page.division);
      const standings = await dataService.getStandings({
        'league':new RegExp(`^${page.league}`,'i'), 
        'season':new RegExp(`^${page.season}`,'i'), 
        'competition':new RegExp(`^${page.division}`,'i')
      });
      data.standings = [];
  
      for(let x in [0,1])
        data.standings[x] = standings.filter((n,i) => i >= x*Math.floor(standings.length/2) && i < Math.floor(standings.length/2) + x*Math.floor(standings.length/2));
  
      data.page = page;
      res.render('text/standings', data);
    } else {
      res.render('text/standings-index', {pages:this.pages, page:{number:200, league:'ReBBL',division:''} });
    }

  }

	routesConfig(){
    this.router.get("/:number", this._number.bind(this));
		this.router.get("/", this._main.bind(this));
  
    return this.router;
  }
}
module.exports = TextRoutes;