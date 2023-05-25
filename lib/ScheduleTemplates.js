"use strict";

const configurationService = require("./ConfigurationService.js");
const dataService = require("./DataService.js").rebbl;

class ScheduleTemplates {
  constructor(){
  }    


  async getTemplate(template, date){

    if (!template) return;

    const divisions = this.getDivisions(template.name,template.league,template.round);

    return template.template.replaceAll("${divisionsBlock}",divisions).replaceAll("${round}",template.round).replaceAll("${date}", date);
  }

  getDivisions(league,url,round){

    if (league.toUpperCase() == "CLAN") return "";

    let config;
    let divisions;

    switch (league.toUpperCase()){
      case "MINORS":
        config = configurationService.getActiveMinorsSeason();
        divisions = config.leagues[0].divisions;
        break;
      case "COLLEGE":
        config = configurationService.getActiveCollegeSeason(); 
        divisions = config.leagues[0].divisions;
        break;
      case "UPSTART":
        config = configurationService.getActiveUpstartSeason();          
        divisions = config.leagues[0].divisions;
        break;
      default:
        config = configurationService.getActiveSeason();
        divisions = config.leagues.find(x => x.hasOwnProperty("exact") && x.link == league).divisions;

    }
    
    return divisions.map(x => this.divisionLine(url,x,round)).join("");
  }


  divisionLine(league, division, round){
    return  `\n  [${division}](https://rebbl.net/${league}/${encodeURIComponent(division)}/${round})    `;
  }

}

module.exports = new ScheduleTemplates();