"use strict";

class ApiService{
  constructor(){
    this.apiUrl = process.env["BB3Url"];
  }

  gamerInfo = async gamerId => this.#get(`/api/gamer/${gamerId}`, "responseGetGamers");

  async #get(path, key){
    try{


      const response = await fetch(`${this.apiUrl}${path}`, {signal: AbortSignal.timeout(20_000)});

      if (!response.ok) return null;
      
      const data = await response.json();
  
      return key ? data[key] : data;
    } catch (err) {
      if (err.name === "TimeoutError") {
        console.error("call timed out.");
      } else {
        console.error("Failed to complete slow operation due to error:", err);
      }
    }
  }

}

module.exports = new ApiService();