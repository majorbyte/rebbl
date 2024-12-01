"use strict";

const configurationService = require("./ConfigurationService.js");
const dataService = require("./DataService.js").rebbl;
const dataServiceBB3 = require("./DataServiceBB3.js").rebbl3;

class ScheduleTemplates {
  constructor(){
  }    


  async getTemplate(template, date){

    if (!template) return;

    const divisions = template.bb3 
      ? await this.getBB3Divisions(template.league,template.competitions,template.round)
      : await this.getDivisions(template.name,template.league,template.round);

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

  async getBB3Divisions(league, prefix,round){

    let divisions = await dataServiceBB3.getCompetitions({leagueId:league, season:"season 3"});

    divisions = divisions.filter(x => x.name.toLowerCase().startsWith(prefix.toLowerCase()));
    
    let line = '';
    for(let division of divisions){
      line += await this.divisionLineBB3(division,round);
    }

    return line;
  }


  async divisionLine(season, league, division, round){
    const leagueName = league.split("/").slice(-1)[0];
    let div = await dataService.getSchedule({season,league:leagueName,competition:division,round});
    if (!div) return `${division} - missing data for URL    `;
    return  `\n  [${division}](https://rebbl.net/${league}/${encodeURIComponent(div.competition_id)}/${round})    `;
  }

  async divisionLineBB3(division, round){
    return  `\n  [${division.name}](https://rebbl.net/bb3/competition/${encodeURIComponent(division.id)}/schedules/${round})    `;
  }
}

module.exports = new ScheduleTemplates();
