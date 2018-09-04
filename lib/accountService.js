"use strict";

const Datastore = require('./async-nedb.js');

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
    if(!account.coach){
      const temp = await this.getAccount(account.reddit);
      account.coach = temp.coach;
    }

    let regex = new RegExp(`${account.reddit}`, 'i');

    await this.accounts.update({'reddit': {"$regex": regex}}, account, {upsert:true});
    return account;
  }

  async updateAccount(account){
    let regex = new RegExp(`${account.reddit}`, 'i');

    delete account._id;

    await this.accounts.update({'reddit': {"$regex": regex}}, {$set:account});
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
      user.strikes[id] = state;
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

}

module.exports = new AccountService();
