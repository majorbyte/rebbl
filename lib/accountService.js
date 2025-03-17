"use strict";

const 
  axios = require("axios")
  , cache = require("memory-cache")
  , dataService = require("./DataService.js").rebbl;

class AccountService {
  constructor() {
    this.apiUrl = process.env["BB3Url"];
    this.roles = ["admin","superadmin","clanleader"];
  }

  async hasRole(redditName){
    let roles = [...arguments];
    roles.splice(0,1);
    let user = await dataService.getAccount({"reddit":redditName});
    return user && user.roles ? roles.some(role => user.roles.includes(role)) : false;
  }

  async getAccount(redditName){
    let regex = new RegExp(`^${redditName}$`, 'i');
    return await dataService.getAccount({'reddit': {"$regex": regex}});
  }

  async searchAccount(criteria){
    return await dataService.getAccount(criteria);
  }

  async searchAccounts(criteria){
    return await dataService.getAccounts(criteria);
  }


  async saveAccount(account){ 
    let regex = new RegExp(`^${account.reddit}$`, 'i');

    let existing = await this.getAccount(account.reddit);

    if(existing){
      existing = Object.assign(existing, account);

      delete existing._id;

      dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:existing});
    } else {
      dataService.updateAccount({'reddit': {"$regex": regex}}, account, {upsert:true});
    }




    return account;
  }

  async updateAccount(account){
    let regex = new RegExp(`^${account.reddit}$`, 'i');

    let existing = await this.getAccount(account.reddit);
    let coachName = existing.coach;
    let updateSignup = false;

    //account.useDark = !!account.useDark;

    if(account.coach && account.coach !== existing.coach){
      //coachname corrected by admin, fix signup as well.
      updateSignup = true;
    }

    existing = Object.assign(existing, account);

    delete existing._id;

    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:existing});

    if (updateSignup){
      let signupService = require("./signupService.js");
      await signupService.updateSignup(coachName, existing);
      cache.del("/api/v1/signups/page");
    }

    return account;
  }

  async createAccount(account){

    //check if reddit account already exists
    let reddit = await this.getAccount(account.reddit);

    if (reddit) throw new Error("The reddit account is already registered on another coach.");

    let coach = await this.searchAccount({coach:{"$regex": new RegExp(`^${account.coach}$`,"i")}});

    if (coach) throw new Error("The coach name is already used on another reddit account.");
    

    dataService.updateAccount({'reddit': account.reddit}, account, {upsert:true});

    return account;

  }

  async changeRedditAccount({reddit, newReddit}){

    let existing = await this.getAccount(reddit);
    let newExisting = await this.getAccount(newReddit);

    if(newExisting || !existing) return; //Either we are changing to an existing account, or the current one does not exist (just in case) ..

    let regex = new RegExp(`^${reddit}$`, 'i');
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{'reddit':newReddit}});

    let signup = await dataService.getSignup({"reddit":reddit});

    if (signup) {
      signup.reddit = newReddit;
      const id = signup._id;
      delete signup._id;
      
      dataService.updateSignup({"_id":id},{$set:signup});
    }

    cache.del("/api/v1/signups/page");

  }

  async addStrike(reddit, strike){

    let user = await this.getAccount(reddit);

    strike.active = true;
    if (user.strikes){
      strike.id = user.strikes.length;
      user.strikes.push(strike);
    } else {
      strike.id = 0;
      user.strikes =[strike];
    }

    let regex = new RegExp(`^${reddit}$`, 'i');
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"strikes":user.strikes}});
    return user.strikes;
  }

  async setStrike(reddit, id, state){

    let user = await this.getAccount(reddit);

    if (user.strikes){
      user.strikes[id] = Object.assign(user.strikes[id], state);

      let regex = new RegExp(`^${reddit}$`, 'i');
      dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"strikes":user.strikes}});
    }
  }

  async updateStrike(reddit, strike){

    let user = await this.getAccount(reddit);

    if (user.strikes){
      user.strikes[strike.id] = strike;
      let regex = new RegExp(`^${reddit}$`, 'i');
      dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"strikes":user.strikes}});
    }
  }

  async addWarning(reddit, warning){

    let user = await this.getAccount(reddit);

    warning.active = true;
    if (user.warnings){
      warning.id = user.warnings.length;
      user.warnings.push(warning);
    } else {
      warning.id = 0;
      user.warnings =[warning];
    }

    let regex = new RegExp(`^${reddit}$`, 'i');
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"warnings":user.warnings}});
    return user.warnings;
  }

  async updateWarning(reddit, warning){

    let user = await this.getAccount(reddit);

    if (user.warnings){
      user.warnings[warning.id] = warning;
      let regex = new RegExp(`^${reddit}$`, 'i');
      dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"warnings":user.warnings}});
    }
  }

  async toggleRole(reddit, role){
    let user = await this.getAccount(reddit);

    if (!user) return;

    if (role.action === "add"){
      if(user.roles && user.roles.indexOf(role.role) === -1) user.roles.push(role.role);
      else if(!user.roles) user.roles = [role.role];
    } else {
      if(user.roles && user.roles.indexOf(role.role) > -1) user.roles.splice(user.roles.indexOf(role.role),1);
    }

    let regex = new RegExp(`^${reddit}$`, 'i');
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"roles":user.roles}});

  }

  async addDonation(reddit, donation){
    let user = await this.getAccount(reddit);

    if (!user) return;

    if(user.donations) user.donations.push(donation);
    else user.donations = [donation];

    if(user.showDonation === undefined) user.showDonation = true;
    if(user.showDonationValue === undefined) user.showDonationValue = true;

    let regex = new RegExp(`^${reddit}$`, 'i');
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"donations":user.donations, "showDonation":user.showDonation, "showDonationValue":user.showDonationValue}});

  }

  async addTrophy(reddit, trophy){
    let user = await this.getAccount(reddit);

    if (!user) return;

    if(user.trophies) user.trophies.push(trophy);
    else user.trophies = [trophy];

    let regex = new RegExp(`^${reddit}$`, 'i');
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"trophies":user.trophies}});

   
    await Promise.all(cache.keys().map(function(key){
      if (key.toLowerCase().indexOf("/coach/")>-1){
        cache.del(key);
      }
    },this));
  }

  async deleteTrophy(reddit, trophy){
    let user = await this.getAccount(reddit);

    if (!user) return;
    if(!user.trophies) return;


    const toRemove = user.trophies.find(t => t.name === trophy.name && t.date === trophy.date && t.filename === trophy.filename && t.title === trophy.title );
    const index = user.trophies.indexOf(toRemove);

    user.trophies.splice(index,1);


    let regex = new RegExp(`^${reddit}$`, 'i');
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"trophies":user.trophies}});
    await Promise.all(cache.keys().map(function(key){
      if (key.toLowerCase().indexOf("/coach/")>-1){
        cache.del(key);
      }
    },this));

    
  }

  async updateTrophy(reddit, index){
    let user = await this.getAccount(reddit);

    if (!user) return;
    if(!user.trophies || user.trophies.length < index ) return;

    user.trophies.map(t => t.display = false);

    user.trophies[index].display = true;

    let regex = new RegExp(`^${reddit}$`, 'i');
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"trophies":user.trophies}});
    await Promise.all(cache.keys().map(function(key){
      if (key.toLowerCase().indexOf("/coach/")>-1){
        cache.del(key);
      }
    },this));

    return user;
  }

  async hideTrophy(reddit, index){
    let user = await this.getAccount(reddit);

    if (!user) return;
    if(!user.trophies || user.trophies.length < index ) return;

    user.trophies[index].display = false;

    let regex = new RegExp(`^${reddit}$`, 'i');
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"trophies":user.trophies}});
    await Promise.all(cache.keys().map(function(key){
      if (key.toLowerCase().indexOf("/coach/")>-1){
        cache.del(key);
      }
    },this));

    return user;
  }

  async addBan(reddit, ban){

    let user = await this.getAccount(reddit);

    ban.active = true;
    if (user.bans){
      ban.id = user.bans.length;
      user.bans.push(ban);
    } else {
      ban.id = 0;
      user.bans =[ban];
    }

    let regex = new RegExp(`^${reddit}$`, 'i');
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"bans":user.bans}});
    return user.bans;
  }

  async setBan(reddit, id, state){

    let user = await this.getAccount(reddit);

    if (user.bans){
      user.bans[id] = Object.assign(user.bans[id], state);
      let regex = new RegExp(`^${reddit}$`, 'i');
      dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"bans":user.bans}});
    }
  }

  async updateBan(reddit, ban){

    let user = await this.getAccount(reddit);

    if (user.bans){
      user.bans[ban.id] = ban;
      let regex = new RegExp(`^${reddit}$`, 'i');
      dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"bans":user.bans}});
    }
  }

  async addNote(reddit, note){

    let user = await this.getAccount(reddit);

    if (user.notes){
      note.id = user.notes.length;
      user.notes.push(note);
    } else {
      note.id = 0;
      user.notes =[note];
    }

    let regex = new RegExp(`^${reddit}$`, 'i');
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"notes":user.notes}});
    return user.warnings;
  }

  async updateNote(reddit, note){

    let user = await this.getAccount(reddit);

    if (user.notes){
      user.notes[note.id] = note;
      let regex = new RegExp(`^${reddit}$`, 'i');
      dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"notes":user.notes}});
    }
  }

  async follow(reddit,coachId){
    let account = await this.getAccount(reddit);
    
    if(!account.following) account.following = [];
    
    if(account.following.indexOf(coachId) === -1 && account.following.length<15) {
      account.following.push(coachId);
      let regex = new RegExp(`^${reddit}$`, 'i');
      dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"following":account.following}});
    }

    return account.following.indexOf(coachId) > -1;
  }

  async unfollow(reddit,coachId){
    let account = await this.getAccount(reddit);
    
    if(!account.following) return true;
    const i = account.following.indexOf(coachId);
    if(i > -1) {
      account.following.splice(i,1);
      let regex = new RegExp(`^${reddit}$`, 'i');
      dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"following":account.following}});
    }

    return true;
  }
  async toggleSchedule(reddit){
    const regex = new RegExp(`^${reddit}$`, 'i');
    const account = await dataService.getAccount({'reddit': {"$regex": regex}});
    account.doNotLoadSchedules = ! account.doNotLoadSchedules;
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"doNotLoadSchedules":account.doNotLoadSchedules}});
  }
  async setIcon(reddit, icon){
    let regex = new RegExp(`^${reddit}$`, 'i');
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"icon":icon}});
  }
  async setTheme(reddit, theme){
    let regex = new RegExp(`^${reddit}$`, 'i');
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"useDark":theme==="dark"}});
  }

  async followers(coachId){
    const data = await dataService.getAccounts({"following":coachId});
    return data.length;    
  }

  async getBB3Account(name){
    try{
      let pageSize = 30;
      let pageNumber = 0;

      let response = await axios.get(`${this.apiUrl}/api/gamer/${name}/search/${pageSize}/0`);

      if (!response) return null;

      if (response.data.responseGetGamersWithName.total ==0) return null;

      let gamers = response.data.responseGetGamersWithName.gamers.gamer;

      if (Array.isArray(gamers)){
        while (Number(response.data.responseGetGamersWithName.nbPages) > pageNumber && pageNumber < 5 ){
          pageNumber++;
          response = await axios.get(`${this.apiUrl}/api/gamer/${name}/search/${pageSize}/${pageNumber*pageSize-1}`);

          gamers = gamers.concat(response.data.responseGetGamersWithName.gamers.gamer);
        }

        let filtered = gamers
          .filter(gamer => gamer.name.localeCompare(name, "en-US", { sensitivity: "base" }) === 0 && (gamer.account.authServices instanceof Object))
          .map((gamer,index) => {return {index, name:gamer.name, id:gamer.id, displayId: gamer.displayUniqueId, service: gamer.account.authServices.account_authServices.code}});

        return filtered;
      } else {
        return [{name: gamers.name, id:gamers.id, displayId: gamers.displayUniqueId, service: gamers.account.authServices.account_authServices.code}];
      }

    }
    catch(e) {
      console.dir(e);
    }
    return null;
  }

  getBB3Accounts = async _ => await dataService.getAccounts({bb3id:{$exists:1}});

  async updateBB3Account(reddit,bb3){
    let regex = new RegExp(`^${reddit}$`, 'i');
    dataService.updateAccount({'reddit': {"$regex": regex}}, {$set:{"bb3coach":bb3.name, "bb3id":bb3.id,  "bb3service":bb3.service, "bb3displayId":bb3.displayId}});
  }

  async updateBB3Info(bb3id, info){
    dataService.updateAccount({bb3id}, {$set:{info}});
  }

}

module.exports = new AccountService();
