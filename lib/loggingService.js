"use strict";

class LoggingService {
  constructor() {
    this.errorUrl = process.env['errorhook'];
  }

  async error(ex){
    const data = {
      embeds: [{
        title: "☠",
        description:  `${ex.message}\r\n${ex.stack}`,
        timestamp : new Date(Date.now()).toISOString()
      }]
    };
    
    try {
      await fetch(this.errorUrl, {
        headers: {
          "Content-Type": "application/json",
        },
        method:"POST",
        body: JSON.stringify(data)
      });

    } catch(ex){
      console.dir(ex);
    }
  }

  async information(msg){
    const data = {
      embeds: [{
        title: "ℹ",
        description:  msg,
        timestamp : new Date(Date.now()).toISOString()
      }]
    };
    
    try {
      await fetch(this.errorUrl, {
        headers: {
          "Content-Type": "application/json",
        },
        method:"POST",
        body: JSON.stringify(data)
      });

    } catch(ex){
      console.dir(ex);
    }
  }
}

module.exports = new LoggingService();