"use strict";

const 
    accountService = require('./accountService.js')
  , async = require('async')
  , axios = require("axios")
  , dataService = require("./DataService.js").rebbl
  , leagueService = require('./LeagueService.js')
  , teamService = require('./teamservice.js')
  , bloodBowlService = require('./bloodbowlService.js')
  , cache = require('memory-cache');



class SignUpService {

  async init(socket){
    this.socket = socket;
  }

  async callHook(signup){
    const url = process.env['rampuphook'];

    const account = await accountService.getAccount(signup.reddit);

    let embed = {
      "title": `New ${signup.league.toUpperCase()} coach`,
      "description":"**---------------------------------------------------------------------**",
      "color": 187908,
      "thumbnail": {
        "url": "https://cdn2.rebbl.net/images/cards/fans_small.png"
      },
      "author": {
        "name": "Griff Oberwald",
        "icon_url": "https://cdn2.rebbl.net/images/logo/256x256/logo_human_18.png"
      },
      "fields": [
        {
          "name": "**coach:**",
          "value": `${signup.coach} (/u/${signup.reddit})`,
          "inline": true
        },
        {
          "name": "**team:**",
          "value": signup.team,
          "inline": true
        }
      ]
    };
    if(signup.teamCreated !== signup.lastPlayed){
      embed.fields.push({
        name:"**Beware: team has played matches**",
        value: "This could be a friendly"
      });
    }
    if(account && account.strikes){
      let strikes = account.strikes.map(s => `Ends: ${s.end}\n${s.reason.substr(0,125)}`);
      embed.fields.push({
        name:"**strikes:**",
        value: strikes.join("\n\n")
      });
    }
    if(account && account.bans){
      let bans = account.bans.map(s => `Ends: ${s.end}\n${s.reason.substr(0,125)}`);
      embed.fields.push({
        name:"**bans:**",
        value: bans.join("\n\n")
      });
    }

    
    const data = {
      embeds: [ embed ]
    };
    

    axios.post(url, JSON.stringify(data),{headers:{"Content-Type": "application/json"}})
    .catch(error => {
      console.log(error.response);
    });

    if (signup.league.toUpperCase() === "REL"){
      //ping mystaes
      axios.post(url, JSON.stringify({content: "<@160927294905384962>"}),{headers:{"Content-Type": "application/json"}});
    } else {
      //ping majorbyte
      axios.post(url, JSON.stringify({content: "<@221669597735157767>"}),{headers:{"Content-Type": "application/json"}}).catch(error => {
        console.log(error.response);
      });
    } 

  }

  async getRookieTeam(coachName){
    let c = await dataService.getRookieTeam({"coach":coachName}); 
    return c;
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
    });
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
      };
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
    };
  }

  async getExistingTeam(redditName) {

    let coach = await accountService.getAccount(redditName);

    if (coach){
      let coachName = new RegExp(`^${coach.coach.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,'i');
      let leagues = await dataService.getSchedules({$and: [{"opponents.coach.name":{$regex:coachName},league:/gman|rel|big/i, "opponents.team.name":{$not:/^\[admin/i}}]},{},{match_uuid:-1}, 1);

      

      if (leagues.length === 0) return coach;

      let league = leagues[0];

      if(league && (league.league.toUpperCase().indexOf('REL')>-1 || league.competition.toUpperCase().indexOf('REL')>-1 ))
         coach.league = 'REL';
      else if (league && (league.league.toUpperCase().indexOf('GMAN')>-1 || league.competition.toUpperCase().indexOf('GMAN')>-1))
        coach.league = 'GMAN';
      else
        coach.league = 'BIG O';

      let index = league.opponents[0].coach.name.toUpperCase() === coach.coach.toUpperCase() ? 0 :1;

      coach.team = league.opponents[index].team.name;
      coach.race = league.opponents[index].team.race;
    }
    return coach;
  }

  async getSignUp(redditName, type){
    return await dataService.getSignup({'reddit': redditName, type:type,season:"season 20"});
  }

  async getSignUps(search){

    if (!dataService.isConnected) return;

    let data = cache.get("signupData");
    if (data) return data;

    

    data = await dataService.getSignups(search || {});

    let ret = { all: null, grouped: null};
    ret.all = await Promise.all(data.map(async function(signUp){

      const coach = await accountService.getAccount(signUp.reddit);

      const team = await teamService.getTeamById(signUp.teamId);

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

    cache.put("signupData",ret);
    return ret;
  }

  async checkTeams(search){
    const data = await dataService.getSignups(search || {season:"season 20",teamId:{$exists:0}});

    const update = dataService.updateSignup.bind(dataService);

    let queue = async.queue(async function(signUp, cb){
      let team = await teamService.retrieveTeam(signUp.team);

      signUp.teamExist = team ? true:false;

      if (team){

        signUp.teamId = team.team.id;

      }
      
      update({'reddit':signUp.reddit}, {$set:signUp});
      cb();
    }, 20 /* 20 at a time*/);

    queue.drain = function() {
      console.log('All Tasks finished successfully.');
    };

    queue.push(data);

  }


  async checkCoaches(){
    const data = await dataService.getSignups({});

    const update = dataService.updateSignup.bind(dataService);

    let queue = async.queue(async function(signUp, cb){
      let matches = await leagueService.getContests({
        'competition': {$regex: new RegExp("^Season 9","i")}
        ,'opponents.coach.name': signUp.coach
      });

      if (matches.length > 0 ){
        signUp.competition = matches[0].competition;
        update({'reddit':signUp.reddit}, {$set:signUp});
      }

      
      cb();
    }, 20 /* 20 at a time*/);

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
    let signUps = await dataService.getSignups({'league':league});
    let limit = Math.ceil(1+signUps.length/10);

    if (isExisting){
      limit += 1;
    }

    let races = _groupBy(signUps, 'race');
    return Object.prototype.hasOwnProperty.call(races,race) ? races[race].length >= limit : false;
  }

  async validate(data){
    let regex = new RegExp(`^${data.coach.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim()}$` , 'i');

    if (data.saveType === "new" || data.saveType === "rampup"){
      let existingAccount = await accountService.searchAccount({'coach':{"$regex": regex}, 'reddit':{"$ne": data.reddit}});
      if(existingAccount) {
        data.error = {coach: "This coach is already registered on another reddit account."};
      }
    }

    /*let existingSignUp = await dataService.getSignup({'coach':{"$regex": regex}});
    if(await this.isAboveRaceLimit(data.league, data.race, existingSignUp)){
      if(data.error){
        data.error.race = `${data.race}'s limit is currently met, change your race or try to sign up later`;
      } else {
        data.error = {race: `${data.race}'s limit is currently met, change your race or try to sign up later`};
      }
    }*/
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
    delete account.teamCreated;
    delete account.lastPlayed;

    return {account: account, signUp: signUp};
  }

  async _handleSignup(signUp){

    if(signUp.saveType !== "existing"){
      await this.validate(signUp);
    }

    if(!signUp.error){

      if (signUp.saveType === "rampup"){
        this.callHook(signUp);
      }

      signUp.signupDate = new Date(Date.now());
      dataService.updateSignup({'reddit':signUp.reddit}, {$set: signUp}, {upsert:true});
      this.checkTeams({team:signUp.team});

      this.notifyClients();
    }

    return signUp;
  }

  async saveSignUp(redditName, data){
    let existing = await this.getExistingTeam(redditName);
    data.reddit = redditName;

    const d = await SignUpService.splitData(data);
    let account = d.account;
    let signUp = d.signUp;

    if (data.steam){
      dataService.updateAccount({reddit:redditName},{$set:{steam:data.steam}});
    }

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
        return await this._handleSignup(signUp);
      case "reroll":
        signUp.competition = "";
        signUp.coach = account.coach = existing.coach;

        return await this._handleSignup(signUp);
      case "new":{
        let team = await dataService.getRookieTeam({"team":signUp.team});
        if (team) signUp.saveType="existing";
        return await this._handleSignup(signUp);
      }
      case "rampup":
      case "reserve":
        return await this._handleSignup(signUp);
    }
  }

  async saveGreenhornSignUp(redditName){
    let signUp = await this.getSignUp(redditName,"rebbl");
    if(signUp && (signUp.saveType === "reroll" || signUp.saveType==="new")){
      signUp.greenHorn = true;
      signUp.updatedOn = new Date(Date.now());
      dataService.updateSignup({'reddit':redditName}, {$set: signUp}, {upsert:true});
      this.notifyClients();
      return signUp;
    }
  }

  async resignGreenhorn(redditName){
    let signUp = await this.getSignUp(redditName,"rebbl");
    if(signUp && (signUp.saveType === "reroll" || signUp.saveType==="new")){
      signUp.greenHorn = false;
      signUp.updatedOn = new Date(Date.now());
      dataService.updateSignup({'reddit':redditName}, {$set: signUp}, {upsert:true});
      this.notifyClients();
    }
  }

  async saveOISignUp(redditName){
    let signUp = await this.getSignUp(redditName,"rebbl");
    if(signUp && signUp.saveType === "existing"){
      signUp.OI = true;
      signUp.updatedOn = new Date(Date.now());
      dataService.updateSignup({'reddit':redditName}, {$set: signUp}, {upsert:true});
      this.notifyClients();
      return signUp;
    }
  }

  async resignOI(redditName){
    let signUp = await this.getSignUp(redditName,"rebbl");
    if(signUp && signUp.saveType === "existing"){
      signUp.OI = false;
      signUp.updatedOn = new Date(Date.now());
      dataService.updateSignup({'reddit':redditName}, {$set: signUp}, {upsert:true});
      this.notifyClients();
    }
  }

  async resign(redditName,type){
    let signUp = await this.getSignUp(redditName,type);
    if(signUp){
      await dataService.deleteSignup({'reddit':redditName, type:type});
      this.notifyClients();
    }
  }


  async updateSignup(coach, account){

    let signup = await dataService.getSignup({"coach":coach});
    if (signup){
      const id = signup._id;
      delete signup._id;

      signup.coach = account.coach;
      signup.reddit = account.reddit;
      signup.updatedOn = new Date(Date.now());

      dataService.updateSignup({"_id":id},{$set:signup});
    }
  }

  async notifyClients(){
    cache.del("signupData");
    cache.del(encodeURI('/api/v1/signups/page'));
    cache.del(encodeURI('/api/v1/signups/count'));
    let data = await this.getSignUps();

    this.socket.emit('signup',{count:data.all.length});
  }


}

module.exports = new SignUpService();
