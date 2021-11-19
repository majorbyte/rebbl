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

  async _loadPages(){
    const seasons = config.getActiveSeason();
    const leagues = seasons.leagues.filter(x => x.divisions.length > 0).sort((a,b) => a.name > b.name ? 1 : -1);
    const announcements = await dataService.getAnnouncements();


    let pageCount = 100;
    const landingPage = {number:pageCount, pages:[]};
    pageCount++;
    for(const announcement of announcements){
      landingPage.pages.push({announcement, number:pageCount++});
    }
    this.pages.push(landingPage);
    this.pages = this.pages.concat(landingPage.pages);

    pageCount = 210;
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
    if (this.pages.length === 0) await this._loadPages();
    const number = Number(req.params.number);
    
    if (number === 100){
      this.landingPage(res, number);
    }else if (number > 100 && number < 200){
      this.newsPage(res, number);
    }else if(number > 199 && number <300){
      this.mainleagueStandings(res,number);
    }
  }

  async landingPage(res, number){
    let page = this.pages.find(x => x.number === number);
    res.render('text/landing', page);
  }
  async newsPage(res, number){
    let page = this.pages.find(x => x.number === number);
    page.announcement.processed = this._splitIntoLines(page.announcement.text, 36);
    res.render('text/news', page);
  }



  async mainleagueStandings(res, number){
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

  _splitIntoLines(input, len) {
    var i;
    var output = [];
    var lineSoFar = "";
    var temp;
    var words = input.split(' ');
    for (i = 0; i < words.length;) {
        // check if adding this word would exceed the len
        temp = this._addWordOntoLine(lineSoFar, words[i]);
        if (temp.length > len) {
            if (lineSoFar.length === 0) {
                lineSoFar = temp; // force to put at least one word in each line
                i++; // skip past this word now
            }
            output.push(lineSoFar); // put line into output
            lineSoFar = ""; // init back to empty
        } else {
            lineSoFar = temp; // take the new word
            i++; // skip past this word now
        }
    }
    if (lineSoFar.length > 0) {
        output.push(lineSoFar);
    }
    return(output);
  }
  
  _addWordOntoLine(line, word) {
      if (line.length !== 0) {
          line += " ";
      }
      return(line += word);
  }  

	routesConfig(){
    this.router.get("/:number", this._number.bind(this));
		this.router.get("/", (req,res) => res.redirect('/100'));
  
    return this.router;
  }
}
module.exports = TextRoutes;