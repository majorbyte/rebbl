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

  async removeBoardMember(boardId){
    if (this.token === ""){
      await this.getToken();
    }

    var response = await axios.delete(`${this.apiUrl}/api/board/${boardId}`,{
      headers:{"Authorization": `Bearer ${this.token}`}
    });

    return response.data;
  }

  async getBoardInfo(leagueId){
    if (this.token === ""){
      await this.getToken();
    }

    var response = await axios.get(`${this.apiUrl}/api/league/${leagueId}/board`,{
      headers:{"Authorization": `Bearer ${this.token}`}
    });

    return response.data;
  }

  async getCoachInfo(coachId, type){
    if (this.token === ""){
      await this.getToken();
    }

    var response = await axios.get(`${this.apiUrl}/api/coach/${coachId}`,{
      headers:{"Authorization": `Bearer ${this.token}`}
    });

    return response.data;
  }

  async searchCoach(coachName, type){
    if (this.token === ""){
      await this.getToken();
    }

    var response = await axios.get(`${this.apiUrl}/api/coach/${encodeURIComponent(coachName)}/search`,{
      headers:{"Authorization": `Bearer ${this.token}`}
    });

    return response.data;
  }

  async ongoingGames(){
    if (this.token === ""){
      await this.getToken();
    }

    var response = await axios.get(`${this.apiUrl}/api/game`,{
      headers:{"Authorization": `Bearer ${this.token}`}
    });

    return response.data;
  }


  async getLeagueInfo(leagueId){
    if (this.token === ""){
      await this.getToken();
    } 
    
    var response = await axios.get(`${this.apiUrl}/api/league/${leagueId}`,{
      headers:{"Authorization": `Bearer ${this.token}`}
    });

    return response.data;
  }

  async getCompetitionInfo(competitionId){
    if (this.token === ""){
      await this.getToken();
    } 
    
    var response = await axios.get(`${this.apiUrl}/api/competition/${competitionId}`,{
      headers:{"Authorization": `Bearer ${this.token}`}
    });

    return response.data;
  }

  async getCompetitionTicketInfo(competitionId){
    if (this.token === ""){
      await this.getToken();
    } 
    
    var response = await axios.get(`${this.apiUrl}/api/ticket/${competitionId}`,{
      headers:{"Authorization": `Bearer ${this.token}`}
    });

    return response.data;
  }


  async approveTicket(competitionId, ticketId, teamId){
    if (this.token === ""){
      await this.getToken();
    }

    var response = await axios.post(`${this.apiUrl}/api/ticket/${ticketId}/competition/${competitionId}/team/${teamId}`,null,{
      headers:{"Authorization": `Bearer ${this.token}`}
    });

    return response.data;
  }

  async getTickets(competitionId){
    
    if (this.token === ""){
      await this.getToken();
    }

    var response = await axios.get(`${this.apiUrl}/api/competition/${competitionId}/tickets`,{
      headers:{"Authorization": `Bearer ${this.token}`}
    });

    return response.data;
  }



  async createCompetition(leagueId, name, teamCount, competitionType, turnDuration, aging, enhancement,resurrection,customTeams,mixedTeams,experiencedTeams ){
    let data = {
      "leagueId":leagueId,
      "name":name,
      "ownerId":ownerId,
      "teamCount":teamCount,
      "competitionType":competitionType,
      "turnDuration": turnDuration,
      "aging":aging,
      "enhancement":enhancement,
      "resurrection":resurrection,
      "customTeams":customTeams,
      "mixedTeams":mixedTeams,
      "experiencedTeams":experiencedTeams
    }
    if (this.token === ""){
      await this.getToken();
    }

    var response = await axios.post(`${this.apiUrl}/api/competition`,{
      headers:{"Authorization": `Bearer ${this.token}`},
      body: data
    });
    return response.data;
    
  }

}

module.exports = new ApiService();
