"use strict";

const axios = require("axios");

class LoggingService {
  constructor() {
    this.url = process.env['errorhook'];
  }

  async error(ex){
    const data = {
      "embeds": [{
        "title": "☠",
        "description":  ex,
        "timestamp" : new Date(Date.now()).toISOString()
      }]
    }
    
    try {
      await axios.post(this.url, data);

    } catch(ex){
      console.dir(ex);
    }
  }

  async information(msg){
    const data = {
      "embeds": [{
        "title": "ℹ",
        "description":  msg,
        "timestamp" : new Date(Date.now()).toISOString()
      }]
    }
    
    try {
      await axios.post(this.url, data);

    } catch(ex){
      console.dir(ex);
    }
  }
}

module.exports = new LoggingService();