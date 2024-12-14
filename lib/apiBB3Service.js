"use strict";

class ApiService{
  constructor(){
    this.apiUrl = process.env["BB3Url"];
  }

  gamerInfo = async gamerId => this.#get(`/api/gamer/${gamerId}`, "responseGetGamers");

  async #get(path, key){
    try{
      const response = await fetch(`${this.apiUrl}${path}`);

      if (!response.ok) return null;
      
      const data = await response.json();
  
      return key ? data[key] : data;
    } catch (e){

    }
  }

}

module.exports = new ApiService();