"use strict";

const Datastore = require('./async-nedb.js')
  , leagueService = require('./leagueservice')
  , cache = require('memory-cache');


class SignupService {
  constructor() {
    this.coaches = new Datastore.datastore('datastore/sheets/coaches.db');
    this.signups = new Datastore.datastore('datastore/sheets/signups.db');

    this.coaches.loadDatabase();
    this.signups.loadDatabase();
  }

  async getExistingTeam(redditName) {
    let regex = new RegExp(`^${redditName}$`, 'i');

    let coach = await this.coaches.findOne({'reddit': {"$regex": regex}});
    if (coach){
      let league = await leagueService.getLeague({'opponents.team.name': coach.team});
      coach.league = league.league.replace('REBBL - ', '').toUpperCase();
    }
    return coach;
  }


  async getSignup(redditName){
    var signup = await this.signups.findOne({'reddit': redditName});
    return signup;
  }

  async getSignups(search){
    return await this.signups.find(search || {});
  }

  async isAboveRaceLimit(league, race, isExisting){
    let _groupBy = function(xs, key) {
      return xs.reduce(function(rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
      }, {});
    };
    let signups = await this.signups.find({'league':league});
    let limit = Math.ceil(1+(signups.length/10));

    if (isExisting){
      limit += 1;
    }

    let races = _groupBy(signups, 'race');
    return races.hasOwnProperty(race) ? races[race].length >= limit : false;
  }

  async validate(data){
    let regex = new RegExp(`^${data.coach.trim()}$` , 'i');


    if (data.saveType === "new"){
      let existingSignup = await this.signups.findOne({'coach':{"$regex": regex}, 'reddit':{"$ne": data.reddit}});
      let existingCoach = await this.coaches.findOne({'coach':{"$regex": regex}, 'reddit':{"$ne": data.reddit}});

      if(existingCoach || existingSignup) {
        data.error = {coach: "This coach is already registered on another reddit account."};
      }
    }

    let existingSignup = await this.signups.findOne({'coach':{"$regex": regex}});
    if(await this.isAboveRaceLimit(data.league, data.race, existingSignup)){
      if(data.error){
        data.error.race = `${data.race}'s limit is currently met, change your race or try to sign up later`;
      } else {
        data.error = {race: `${data.race}'s limit is currently met, change your race or try to sign up later`};
      }
    }

  }

  async saveSignup(redditName, data){

    let existing = await this.getExistingTeam(redditName);
    data.reddit = redditName;



    switch (data.saveType){
      case "existing":
        let league = await leagueService.getLeague({'opponents.team.name': existing.team});

        data.competition = league.competition;
        data.team = existing.team;
        data.coach = existing.coach;
        data.email = existing.email;
        data.steam = existing.steam;
        data.race = existing.race;

        await this.signups.update({'reddit':data.reddit}, data, {upsert:true});
        cache.del(encodeURI('/signup/signups'));
        return data;
      case "reroll":
        data.competition = "";
        data.coach = existing.coach;
        data.email = existing.email;
        data.steam = existing.steam;

        await this.validate(data);

        if(!data.error){
          await this.signups.update({'reddit':data.reddit}, data, {upsert:true});
          cache.del(encodeURI('/signup/signups'));
        }

        return data;
      case "new":
        await this.validate(data);

        if (!data.error) {
          await this.signups.update({'reddit': data.reddit}, data, {upsert: true});
          cache.del(encodeURI('/signup/signups'));
        }
        
        return data;
    }
  }

  async saveGreenhornSignup(redditName){
    let signup = await this.getSignup(redditName);
    if(signup && (signup.saveType === "reroll" || signup.saveType==="new")){
      signup.greenHorn = true;
      await this.signups.update({'reddit':redditName}, signup, {upsert:true});
      return signup;
    }
  }

  async resignGreenhorn(redditName){
    let signup = await this.getSignup(redditName);
    if(signup && (signup.saveType === "reroll" || signup.saveType==="new")){
      signup.greenHorn = false;
      await this.signups.update({'reddit':redditName}, signup, {upsert:true});
    }
  }

  async resign(redditName){
    let signup = await this.getSignup(redditName);
    if(signup){
      await this.signups.remove({'reddit':redditName});
    }
  }


}

module.exports = new SignupService();
