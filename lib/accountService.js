"use strict";

const Datastore = require('./async-nedb.js');

class AccountService {
  constructor() {
    this.accounts = new Datastore.datastore('datastore/account/accounts.db');

    this.accounts.loadDatabase();
  }

  async getAccount(redditName){
    let regex = new RegExp(`${redditName}`, 'i');
    return await this.accounts.findOne({'reddit': {"$regex": regex}});
  }

  async searchAccount(criteria){
    return await this.accounts.findOne(criteria);
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

}

module.exports = new AccountService();
