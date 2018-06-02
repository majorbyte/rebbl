"use strict";

const Datastore = require('./async-nedb.js');

class AccountService {
  constructor() {
    this.accounts = new Datastore.datastore('datastore/account/accounts.db');

    this.accounts.loadDatabase();
  }

  async getAccount(redditName){
    return await this.accounts.findOne({'reddit': redditName});
  }

  async searchAccount(criteria){
    return await this.accounts.findOne(criteria);
  }


  async saveAccount(account){
    if(!account.coach){
      const temp = await this.getAccount(account.reddit);
      account.coach = temp.coach;
    }

    await this.accounts.update({'reddit': account.reddit}, account, {upsert:true});
    return account;
  }

}

module.exports = new AccountService();
