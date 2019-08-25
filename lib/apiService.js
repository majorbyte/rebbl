"use strict";
const axios = require("axios")

class ApiService{
  constructor(){
    this.clientId = process.env["clientId"];
    this.clientSecret = process.env["clientSecret"];
    this.tennantId = process.env["tennantId"];
    this.apiUrl = process.env["apiUrl"];
    this.scope = process.env["scope"];
    this.token = "";
  }


  _transform(data){
    return Object.entries(data)
    .map(x => `${encodeURIComponent(x[0])}=${encodeURIComponent(x[1])}`)
    .join('&')
  }

  async getToken(){
    var response = await axios.post(`https://login.microsoftonline.com/${this.tennantId}/oauth2/v2.0/token`, this._transform({
      client_id:this.clientId,
      client_secret:this.clientSecret,
      grant_type:"client_credentials",
      scope:this.scope
    }), {headers: {"Content-Type": "application/x-www-form-urlencoded"}});

    setTimeout(() => this.token = "", 59*60*1000);
    this.token = response.data.access_token;
  }


  async expel(competitionId, teamId){
    
    if (this.token === ""){
      await this.getToken();
    }

    var response = await axios.delete(`${this.apiUrl}/api/competition/${competitionId}/expel/${teamId}`,{
      headers:{"Authorization": `Bearer ${this.token}`}
    });

    return response.data;
  }

  async addBoardMember(leagueId, coachName, coachId, type){
    if (this.token === ""){
      await this.getToken();
    }

    var response = await axios.put(`${this.apiUrl}/api/board/${leagueId}`,{
      coachName: coachName,
      coachId: coachId,
      profileType: type
    },{
      headers:{"Authorization": `Bearer ${this.token}`}
    });

    return response.data;

  }


}

module.exports = new ApiService();
