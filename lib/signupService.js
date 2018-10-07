"use strict";

const Datastore = require('./async-nedb.js')
  , async = require('async')
  , leagueService = require('./LeagueService.js')
  , accountService = require('./accountService.js')
  , teamService = require('./teamservice.js')
  , bloodBowlService = require('./bloodbowlService.js')
  , cache = require('memory-cache');


class SignUpService {
  constructor() {
      this.signUps = new Datastore.datastore('datastore/signup/season10.db');

      this.signUps.loadDatabase().catch((err) => console.log(err));
  }

  _groupBy( array , f )
  {
    let groups = {};
    array.forEach( function( o )
    {
      let group = JSON.stringify( f(o) );
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

  async _calculateTV(team){

    if (!team){
      return {
        currentTV : 0,
        actualTV : 0,
        players: 0,
        ff: 0,
        cheerleaders: 0,
        coaches: 0,
        apothecary: 0,
        rerolls: 0,
        cash: 0,
        lonerCost: 0,
        rerollCost: 0
      }
    }


    const lonerCost = await bloodBowlService.getLonerCost(team.team.idraces);
    const rerollCost = await bloodBowlService.getRerollCost(team.team.idraces);


    let playersValue = team.roster ? team.roster.reduce(function(p,c){
      return p + c.value;
    },0) : 0;

    if (team.team.nbplayers < 11){
      playersValue += lonerCost * (11 -team.team.nbplayers)/1000;
    }

    let assistValue = team.team.apothecary * 50 + (team.team.popularity + team.team.cheerleaders + team.team.assistantcoaches) * 10;

    let rerollValue = team.team.rerolls * rerollCost/1000;

    let cashValue = 0;
    if (team.team.cash > 150000){
        cashValue = (team.team.cash -150000)/1000;
    }

    return {
      currentTV : team.team.value,
      actualTV : playersValue + assistValue +cashValue + rerollValue,
      players: team.team.nbplayers,
      ff: team.team.popularity,
      cheerleaders: team.team.cheerleaders,
      coaches: team.team.assistantcoaches,
      apothecary: team.team.apothecary,
      rerolls: team.team.rerolls,
      cash: team.team.cash,
      lonerCost: lonerCost,
      rerollCost: rerollCost
    }
  }

  async confirm(redditName){
    let signUp = await this.getSignUp(redditName);
    signUp.confirmed = true;
    await this.signUps.update({'reddit':signUp.reddit}, signUp);
  }

  async getExistingTeam(redditName) {

    let coach = await accountService.getAccount(redditName)

    if (coach){
      let league = await leagueService.getLeague({'opponents.team.name': coach.team});
      if(league){
        coach.league = league.league.replace('REBBL - ', '').toUpperCase();
      }
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

      const team = await teamService.getTeam(signUp.team);

      const extra = await this._calculateTV(team);

      return Object.assign(coach,signUp,extra);
    },this),this);

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

  async checkTeams(search){
    const data = await this.signUps.find(search || {});

    const update = this.signUps.update;

    let queue = async.queue(async function(signUp, cb){
      signUp.teamExist = await teamService.retrieveTeam(signUp.team);

      await update({'reddit':signUp.reddit}, signUp);
      cb();
    }, 20  /* 20 at a time*/);

    queue.drain = function() {
      console.log('All Tasks finished successfully.');
    };

    queue.push(data);

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
      if(existingAccount) {
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
        if (existing.rookie){
          signUp.team = existing.team;
          signUp.coach = account.coach = existing.coach;
          signUp.race = existing.race;
          signUp.rookie = true;

        } else {
          let league = await leagueService.getLeague({'opponents.team.name': existing.team});
          if (league)
            signUp.competition = league.competition;
          signUp.team = existing.team;
          signUp.coach = account.coach = existing.coach;
          signUp.race = existing.race;
        }
          return await this._handleSignup(signUp, account);
      case "reroll":
        signUp.competition = "";
        signUp.coach = account.coach = existing.coach;

        return await this._handleSignup(signUp, account);
      case "new":
      case "rampup":
        return await this._handleSignup(signUp, account);
    }
  }

  async saveGreenhornSignUp(redditName){
    let signUp = await this.getSignUp(redditName);
    if(signUp && (signUp.saveType === "reroll" || signUp.saveType==="new")){
      signUp.greenHorn = true;
      await this.signUps.update({'reddit':redditName}, signUp, {upsert:true});
      cache.del(encodeURI('/signup/signups'));
      return signUp;
    }
  }

  async resignGreenhorn(redditName){
    let signUp = await this.getSignUp(redditName);
    if(signUp && (signUp.saveType === "reroll" || signUp.saveType==="new")){
      signUp.greenHorn = false;
      await this.signUps.update({'reddit':redditName}, signUp, {upsert:true});
      cache.del(encodeURI('/signup/signups'));
    }
  }

  async saveOISignUp(redditName){
    let signUp = await this.getSignUp(redditName);
    if(signUp && signUp.saveType === "existing"){
      signUp.OI = true;
      await this.signUps.update({'reddit':redditName}, signUp, {upsert:true});
      cache.del(encodeURI('/signup/signups'));
      return signUp;
    }
  }

  async resignOI(redditName){
    let signUp = await this.getSignUp(redditName);
    if(signUp && signUp.saveType === "existing"){
      signUp.OI = false;
      await this.signUps.update({'reddit':redditName}, signUp, {upsert:true});
      cache.del(encodeURI('/signup/signups'));
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
