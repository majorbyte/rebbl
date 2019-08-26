"use strict";
const dataService = require('./DataService.js').rebbl;

class ConfigurationService {
  constructor() {
    this.configuration = [];
  }

async init(cb) {
    let doc = await dataService.getConfiguration({"league":"rebbl"});
    this.seasons = doc.seasons;
    this.configuration.push(doc);

    doc = await dataService.getConfiguration({"league":"one minute"});
    this.oneMinuteSeasons = doc.seasons;
    this.configuration.push(doc);
    
    doc = await dataService.getConfiguration({"league":"lineman league"});
    this.linemanSeasons = doc.seasons;
    this.configuration.push(doc);
    

    doc = await dataService.getConfiguration({"league":"xscessively elfly"});
    this.elflySeasons = doc.seasons;
    this.configuration.push(doc);
    
    doc = await dataService.getConfiguration({"league":"Open Invitational"});
    this.openInvitational = doc.seasons;
    this.configuration.push(doc);

    doc = await dataService.getConfiguration({"league":"Greenhorn Cup"});
    this.greenhorn = doc.seasons;
    this.configuration.push(doc);

    doc = await dataService.getConfiguration({"league":"rabbl"});
    this.rabbl = doc.seasons;
    this.configuration.push(doc);

    doc = await dataService.getConfiguration({"league":"RAMPUP"});
    this.rampup = doc.seasons;
    this.configuration.push(doc);

    doc = await dataService.getConfiguration({"league":"Eurogamer"});
    this.eurogamer = doc.seasons;
    this.configuration.push(doc);

    doc = await dataService.getConfiguration({"league":"ReBBRL Minors League"});
    this.minors = doc.seasons;
    this.configuration.push(doc);

    doc = await dataService.getConfiguration({"league":"ReBBRL College League"});
    this.college = doc.seasons;
    this.configuration.push(doc);

    doc = await dataService.getConfiguration({"league":"ReBBRL Upstarts"});
    this.upstart = doc.seasons;
    this.configuration.push(doc);

    doc = await dataService.getConfiguration({"league":"REBBL Clan"});
    this.clan = doc.seasons;
    this.configuration.push(doc);


    //sigh, sorry ..
    this.leagues = await dataService.getSeasons();

    if (cb) cb();
  }

  getSeasons () {return this.seasons
    .concat(this.oneMinuteSeasons)
    .concat(this.linemanSeasons)
    .concat(this.elflySeasons)
    .concat(this.openInvitational)
    .concat(this.greenhorn)
    .concat(this.rabbl)
    .concat(this.rampup)
    .concat(this.eurogamer)
    .concat(this.minors)
    .concat(this.college)
    .concat(this.upstart)
    .concat(this.clan)
  };

  getActiveSeason () {return this.seasons.find((s) => s.active === true )}

  getActiveOneMinuteSeason () {return this.oneMinuteSeasons.find((s) => s.active === true )}

  getActiveLinemanSeason () {return this.linemanSeasons.find((s) => s.active === true )}

  getActiveElflySeason () {return this.elflySeasons.find((s) => s.active === true )}

  getActiveOISeason () {return this.openInvitational.find((s) => s.active === true )}

  getActiveGreenhornSeason () {return this.greenhorn.find((s) => s.active === true )}

  getActiveRabblSeason () {return this.rabbl.find((s) => s.active === true )}

  getActiveRampupSeason () {return this.rampup.find((s) => s.active === true )}

  getActiveEurogameSeason () {return this.eurogamer.find((s) => s.active === true )}

  getActiveMinorsSeason () {return this.minors.find((s) => s.active === true )}
  
  getActiveCollegeSeason () {return this.college.find((s) => s.active === true )}
  
  getActiveUpstartSeason () {return this.upstart.find((s) => s.active === true )}
  
  getActiveClanSeason () {return this.clan.find((s) => s.active === true )}

  getPlayoffTickets (league) {
    league = league.toLowerCase();
    let ret = [];

    let seasons = this.seasons;

    if (league === "one minute")
     seasons = this.oneMinuteSeasons;
    if (league === "rebbll")
      seasons = this.linemanSeasons; 

    seasons.map(function(season){
      let l = season.leagues.find((a) => a.link.toLowerCase() === league );
      if (!l) l = season.leagues.find((a) => a.name.toLowerCase() === league );
      if (l) {
        ret.push({
          name : season.name,
          cutoff: l.playoffs,
          challenger: l.challenger
        });
      }
    })
    return ret;
  }

  getLeagues(){
    return [...new Set(this.leagues.map(l => l.league))];
  }

  getAvailableSeasons(league){
    return [...new Set(this.leagues.filter(l=>l.league === league).map(l => l.season))];
  }

}

module.exports = new ConfigurationService();