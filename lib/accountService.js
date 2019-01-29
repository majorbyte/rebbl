"use strict";

const Datastore = require("./async-nedb.js")
, cache = require("memory-cache");

class AccountService {
  constructor() {
    this.accounts = new Datastore.datastore('datastore/account/accounts.db');
    this.roles = ["admin","superadmin"];
    this.accounts.loadDatabase();
    this._init();
  }

  async _init(){
    this.accounts.findOne({"reddit":"minorbyte"})
      .then(user =>{
        if (!user.roles) {
          this.accounts.update({"reddit":"minorbyte"}, {$set: {"roles":["superadmin","admin"]}});
        }
      }); 
  }

  async hasRole(redditName,role){
    let user = await this.accounts.findOne({"reddit":redditName});
    return user && user.roles ? user.roles.indexOf(role) > -1 : false;
  }

  async getAccount(redditName){
    let regex = new RegExp(`${redditName}`, 'i');
    return await this.accounts.findOne({'reddit': {"$regex": regex}});
  }

  async searchAccount(criteria){
    return await this.accounts.findOne(criteria);
  }

  async searchAccounts(criteria){
    return await this.accounts.find(criteria);
  }


  async saveAccount(account){
    let regex = new RegExp(`${account.reddit}`, 'i');

    let existing = await this.getAccount(account.reddit);

    if(existing){
      existing = Object.assign(existing, account);

      delete existing._id;

      await this.accounts.update({'reddit': {"$regex": regex}}, {$set:existing});
    } else {
      await this.accounts.update({'reddit': {"$regex": regex}}, account, {upsert:true});
    }




    return account;
  }

  async updateAccount(account){
    let regex = new RegExp(`${account.reddit}`, 'i');

    let existing = await this.getAccount(account.reddit);
    let coachName = existing.coach;
    let updateSignup = false;

    if(account.coach && account.coach != existing.coach){
      //coachname corrected by admin, fix signup as well.
      updateSignup = true;
    }

    existing = Object.assign(existing, account);

    delete existing._id;

    await this.accounts.update({'reddit': {"$regex": regex}}, {$set:existing});

    if (updateSignup){
      let signupService = require("./signupService.js");
      await signupService.updateSignup(coachName, existing);
      cache.del("/api/v1/signups/page");
    }

    return account;
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

    let regex = new RegExp(`${reddit}`, 'i');
    await this.accounts.update({'reddit': {"$regex": regex}}, {$set:{"strikes":user.strikes}});
    return user.strikes;
  }

  async setStrike(reddit, id, state){

    let user = await this.getAccount(reddit);

    if (user.strikes){
      user.strikes[id] = Object.assign(user.strikes[id], state);

      let regex = new RegExp(`${reddit}`, 'i');
      await this.accounts.update({'reddit': {"$regex": regex}}, {$set:{"strikes":user.strikes}});
    }
  }

  async updateStrike(reddit, strike){

    let user = await this.getAccount(reddit);

    if (user.strikes){
      user.strikes[strike.id] = strike;
      let regex = new RegExp(`${reddit}`, 'i');
      await this.accounts.update({'reddit': {"$regex": regex}}, {$set:{"strikes":user.strikes}});
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

    let regex = new RegExp(`${reddit}`, 'i');
    await this.accounts.update({'reddit': {"$regex": regex}}, {$set:{"warnings":user.warnings}});
    return user.warnings;
  }

  async updateWarning(reddit, warning){

    let user = await this.getAccount(reddit);

    if (user.warnings){
      user.warnings[warning.id] = warning;
      let regex = new RegExp(`${reddit}`, 'i');
      await this.accounts.update({'reddit': {"$regex": regex}}, {$set:{"warnings":user.warnings}});
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

    let regex = new RegExp(`${reddit}`, 'i');
    await this.accounts.update({'reddit': {"$regex": regex}}, {$set:{"roles":user.roles}});

  }

  async addDonation(reddit, donation){
    let user = await this.getAccount(reddit);

    if (!user) return;

    if(user.donations) user.donations.push(donation);
    else user.donations = [donation];

    if(user.showDonation === undefined) user.showDonation = true;
    if(user.showDonationValue === undefined) user.showDonationValue = true;

    let regex = new RegExp(`${reddit}`, 'i');
    await this.accounts.update({'reddit': {"$regex": regex}}, {$set:{"donations":user.donations, "showDonation":user.showDonation, "showDonationValue":user.showDonationValue}});

    if (!user.showDonation){
      cache.del("/rebbl/Gman");
      cache.del("/rebbl/REL");
      cache.del("/rebbl/Big O");
      cache.del("/rebbl/rampup");
      cache.del("/rebbl/stunty");
      cache.del("/rebbl/One Minute");
      cache.del("/rebbl/rebbll");
      cache.del("/XScessively Elfly League");
    }
  }

  async addTrophy(reddit, trophy){
    let user = await this.getAccount(reddit);

    if (!user) return;

    if(user.trophies) user.trophies.push(trophy);
    else user.trophies = [trophy];

    let regex = new RegExp(`${reddit}`, 'i');
    await this.accounts.update({'reddit': {"$regex": regex}}, {$set:{"trophies":user.trophies}});

   
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


    let regex = new RegExp(`${reddit}`, 'i');
    await this.accounts.update({'reddit': {"$regex": regex}}, {$set:{"trophies":user.trophies}});
    await Promise.all(cache.keys().map(function(key){
      if (key.toLowerCase().indexOf("/coach/")>-1){
        cache.del(key);
      }
    },this));

  }



  async toggleDonation(reddit, role){}

  async toggleDonationValue(reddit, role){}

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

    let regex = new RegExp(`${reddit}`, 'i');
    await this.accounts.update({'reddit': {"$regex": regex}}, {$set:{"bans":user.bans}});
    return user.bans;
  }

  async setBan(reddit, id, state){

    let user = await this.getAccount(reddit);

    if (user.bans){
      user.bans[id] = Object.assign(user.bans[id], state);
      let regex = new RegExp(`${reddit}`, 'i');
      await this.accounts.update({'reddit': {"$regex": regex}}, {$set:{"bans":user.bans}});
    }
  }

}

module.exports = new AccountService();
