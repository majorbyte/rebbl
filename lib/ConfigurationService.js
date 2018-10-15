"use strict";
const axios = require('axios');
const Datastore = require('nedb');

class ConfigurationService {
  constructor() {
    this.config = new Datastore({filename:'datastore/config.db'});
    this.configuration = [];

    this.config.loadDatabase();
    this.config.findOne({"league":"rebbl"}, function(err,doc){
      this.seasons = doc.seasons;
      this.configuration.push(doc);
    }.bind(this));

    this.config.findOne({"league":"one minute"}, function(err,doc){
      this.oneMinuteSeasons = doc.seasons;
      this.configuration.push(doc);
    }.bind(this));
    
    this.config.findOne({"league":"lineman league"}, function(err,doc){
      this.linemanSeasons = doc.seasons;
      this.configuration.push(doc);
    }.bind(this));
    

    this.config.findOne({"league":"xscessively elfly"}, function(err,doc){
      this.elflySeasons = doc.seasons;
      this.configuration.push(doc);
    }.bind(this));

    this.config.findOne({"league":"Open Invitational"}, function(err,doc){
      this.openInvitational = doc.seasons;
      this.configuration.push(doc);
    }.bind(this));

    this.config.findOne({"league":"Greenhorn Cup"}, function(err,doc){
      this.greenhorn = doc.seasons;
      this.configuration.push(doc);
    }.bind(this));

  }

  getSeasons () {return this.seasons.concat(this.oneMinuteSeasons).concat(this.linemanSeasons).concat(this.elflySeasons).concat(this.openInvitational).concat(this.greenhorn)};

  getActiveSeason () {return this.seasons.find((s) => s.active === true )}

  getActiveOneMinuteSeason () {return this.oneMinuteSeasons.find((s) => s.active === true )}

  getActiveLinemanSeason () {return this.linemanSeasons.find((s) => s.active === true )}

  getActiveElflySeason () {return this.elflySeasons.find((s) => s.active === true )}

  getActiveOISeason () {return this.openInvitational.find((s) => s.active === true )}

  getActiveGreenhornSeason () {return this.greenhorn.find((s) => s.active === true )}


  getPlayoffTickets (league) {
    league = league.toLowerCase();
    let ret = [];
    this.seasons.map(function(season){
      let l = season.leagues.find((a) => a.link.toLowerCase() === league );
      if (l) {
        ret.push({
          name : season.name,
          cutoff: l.playoffs
        });
      }
    })
    return ret;
  }


  parseHtmlEntities(str) {
    return str.replace(/&#([0-9]{1,3});/gi, function(match, numStr) {
      var num = parseInt(numStr, 10); // read num as normal number
      return String.fromCharCode(num);
    });
  }

  async getArticles(){

    const response =  await axios.get(`http://news.rebbl.net/home`);

    let regex =  /<article class="media content-section">((.|\n)*?)<\/article>/gi;
    //let regex =  /<div class="col-md-4 py-2">((.|\n)*?)<\/div>\s*<div class="row">/gi;
    
    let m = regex.exec(response.data);

    let articles = [];
    let link = /<a class="article-title" href="((.|\n)*?)">/;
    let type = /<small class="text-muted">((.|\n)*?)<\/small>/;
    let title = /<a class="article-title" href=".*">((.|\n)*?)<\/a>/;
    let text = /<p class="article-content">((.|\n)*?)<a/;
    let writer = /<a class="mr-2" href=".*">((.|\n)*?)<\/a>/;

    while(m){
      let article = {
        link: link.exec(m[1])[1].replace(/\t/g,'').replace(/\n/g,'').replace(/&nbsp;/g,' '),
        type: type.exec(m[1])[1].replace(/\t/g,'').replace(/\n/g,'').replace(/&nbsp;/g,' '),
        title: this.parseHtmlEntities(title.exec(m[1])[1].replace(/\t/g,'').replace(/\n/g,'').replace(/&nbsp;/g,' ')),
        text: this.parseHtmlEntities(text.exec(m[1])[1].replace(/\t/g,'').replace(/\n/g,'').replace(/&nbsp;/g,' ').slice(0,-2)),
        writer: writer.exec(m[1])[1]
      };

      let a = articles.find(a => a.type === article.type);
      if (!a) articles.push(article);
      //articles.push(m[0]);      
      m = regex.exec(response.data);
    }
      
    return articles;

  }

}

module.exports = new ConfigurationService();