"use strict";

const Datastore = require('./async-nedb.js')
  , leagueService = require('./LeagueService.js')
  , accountService = require('./accountService.js')
  , cache = require('memory-cache');


class SignUpService {
  constructor() {
      this.coaches = new Datastore.datastore('datastore/sheets/coaches.db');
      this.signUps = new Datastore.datastore('datastore/signup/season9.db');


      this.coaches.loadDatabase().catch((err) => console.log(err));
      this.signUps.loadDatabase().catch((err) => console.log(err));
  }

  _groupBy( array , f )
  {
    var groups = {};
    array.forEach( function( o )
    {
      var group = JSON.stringify( f(o) );
      groups[group] = groups[group] || [];
      groups[group].push( o );
    });

    return Object.keys(groups).map( function( group )
    {
      const g = JSON.parse(group);
      return { league: g[0],
        race: g[1],
        count: groups[group].length};
    })
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

  async getSignUp(redditName){
    return await this.signUps.findOne({'reddit': redditName});
  }

  async getSignUps(search){

    const data = await this.signUps.find(search || {});

    let ret = { all: null, grouped: null};
    ret.all = await Promise.all(data.map(async function(signUp){

      const coach = await accountService.getAccount(signUp.reddit);

      return Object.assign(signUp, coach);
    }));

    ret.grouped = this._groupBy(ret.all, function(item)
    {
      return [item.league, item.race];
    }).sort(function(a,b){
      if (a.league > b.league) return -1;
      if (a.league < b.league) return 1;

      if (a.race > b.race) return 1;
      if (a.race < b.race) return -1;

      return 0;
    });

    return ret;
  }

  async isAboveRaceLimit(league, race, isExisting){
    let _groupBy = function(xs, key) {
      return xs.reduce(function(rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
      }, {});
    };
    let signUps = await this.signUps.find({'league':league});
    let limit = Math.ceil(1+(signUps.length/10));

    if (isExisting){
      limit += 1;
    }

    let races = _groupBy(signUps, 'race');
    return races.hasOwnProperty(race) ? races[race].length >= limit : false;
  }

  async validate(data){
    let regex = new RegExp(`^${data.coach.trim()}$` , 'i');

    if (data.saveType === "new"){
      let existingAccount = await accountService.searchAccount({'coach':{"$regex": regex}, 'reddit':{"$ne": data.reddit}});
      let existingCoach = await this.coaches.findOne({'coach':{"$regex": regex}, 'reddit':{"$ne": data.reddit}});
      if(existingCoach || existingAccount) {
        data.error = {coach: "This coach is already registered on another reddit account."};
      }
    }

    let existingSignUp = await this.signUps.findOne({'coach':{"$regex": regex}});
    if(await this.isAboveRaceLimit(data.league, data.race, existingSignUp)){
      if(data.error){
        data.error.race = `${data.race}'s limit is currently met, change your race or try to sign up later`;
      } else {
        data.error = {race: `${data.race}'s limit is currently met, change your race or try to sign up later`};
      }
    }
  }

  static async splitData(data){
    let account = await accountService.getAccount(data.reddit);

    if (!data.coach && account){
      // when changing signup, coach is set to disabled, thus not posted
      data.coach=account.coach;
    }

    let signUp = Object.assign({}, data);
    delete signUp.discord;
    delete signUp.steam;
    delete signUp.timezone;


    account = Object.assign(account || {}, data);
    delete account.competition;
    delete account.greenHorn;
    delete account.league;
    delete account.race;
    delete account.saveType;
    delete account.team;

    return {account: account, signUp: signUp};
  }

  async _handleSignup(signUp, account){

    await accountService.saveAccount(account);

    if(signUp.saveType !== "existing"){
      await this.validate(signUp);
    }

    if(!signUp.error){
      await this.signUps.update({'reddit':signUp.reddit}, signUp, {upsert:true});
      cache.del(encodeURI('/signup/signups'));
    }

    return signUp;
  }

  async saveSignUp(redditName, data){
    let existing = await this.getExistingTeam(redditName);
    data.reddit = redditName;

    const d = await SignUpService.splitData(data);
    let account = d.account;
    let signUp = d.signUp;

    switch (signUp.saveType){
      case "existing":
        let league = await leagueService.getLeague({'opponents.team.name': existing.team});

        signUp.competition = league.competition;
        signUp.team = existing.team;
        signUp.coach = account.coach = existing.coach;
        signUp.race = existing.race;

        return await this._handleSignup(signUp, account);
      case "reroll":
        signUp.competition = "";
        signUp.coach = account.coach = existing.coach;

        return await this._handleSignup(signUp, account);
      case "new":
        return await this._handleSignup(signUp, account);
    }
  }

  async saveGreenhornSignUp(redditName){
    let signUp = await this.getSignUp(redditName);
    if(signUp && (signUp.saveType === "reroll" || signUp.saveType==="new")){
      signUp.greenHorn = true;
      await this.signUps.update({'reddit':redditName}, signUp, {upsert:true});
      return signUp;
    }
  }

  async resignGreenhorn(redditName){
    let signUp = await this.getSignUp(redditName);
    if(signUp && (signUp.saveType === "reroll" || signUp.saveType==="new")){
      signUp.greenHorn = false;
      await this.signUps.update({'reddit':redditName}, signUp, {upsert:true});
    }
  }

  async resign(redditName){
    let signUp = await this.getSignUp(redditName);
    if(signUp){
      await this.signUps.remove({'reddit':redditName});
    }
  }
}

module.exports = new SignUpService();
