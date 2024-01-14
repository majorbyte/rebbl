"use strict";

const configurationService = require("./ConfigurationService.js");
const dataService = require("./DataService.js").rebbl;

class ScheduleTemplates {
  constructor(){
  }    


  async getTemplate(template, date){

    if (!template) return;

    const divisions = await this.getDivisions(template.name,template.league,template.round);

    return template.template.replaceAll("${divisionsBlock}",divisions).replaceAll("${round}",template.round).replaceAll("${date}", date);
  }

  async getDivisions(league,url,round){

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
    
    let line = '';
    for(let division of divisions){
      line += await this.divisionLine(config.name, url,division,round);
    }

    return line;
  }


  async divisionLine(season, league, division, round){
    const leagueName = league.split("/").slice(-1)[0];
    let div = await dataService.getSchedule({season,league:leagueName,competition:division,round});
    return  `\n  [${division}](https://rebbl.net/${league}/${encodeURIComponent(div.competition_id)}/${round})    `;
  }

}

module.exports = new ScheduleTemplates();