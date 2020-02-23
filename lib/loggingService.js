"use strict";

const axios = require("axios");

class LoggingService {
  constructor() {
    this.errorUrl = process.env['errorhook'];
    this.oiUrl = process.env["oiwebhook"];
  }

  async error(ex){
    const data = {
      "embeds": [{
        "title": "☠",
        "description":  `${ex.message}\r\n${ex.stack}`,
        "timestamp" : new Date(Date.now()).toISOString()
      }]
    };
    
    try {
      await axios.post(this.errorUrl, data);

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
    };
    
    try {
      await axios.post(this.errorUrl, data);

    } catch(ex){
      console.dir(ex);
    }
  }

  async informMatchStarted(msg){
    const data = {
      "content": msg
    };
    
    try {
      await axios.post(this.oiUrl, data);
    } catch(ex){
      console.dir(ex);
    }
  }
}

module.exports = new LoggingService();