"use strict";
const axios = require("axios"),
  dataService = require("./DataService.js").rebbl,
  logger = require("./loggingService.js"),
  fs = require('fs/promises');

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
    .join('&');
  }

  async getToken(){
    if (this.token !== "") return this.token;
    
    var response = await axios.post(`https://login.microsoftonline.com/${this.tennantId}/oauth2/v2.0/token`, this._transform({
      client_id:this.clientId,
      client_secret:this.clientSecret,
      grant_type:"client_credentials",
      scope:this.scope
    }), {headers: {"Content-Type": "application/x-www-form-urlencoded"}}).catch(err => {
      console.trace(`${err.message}`);
    });

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

  async getCoachInfo(coachId){
    if (this.token === ""){
      await this.getToken();
    }

    var response = await axios.get(`${this.apiUrl}/api/coach/${coachId}`,{
      headers:{"Authorization": `Bearer ${this.token}`}
    });

    return response.data;
  }

  async searchCoach(coachName){
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

  async findCoach(name){
      if (this.token === ""){
        await this.getToken();
      } 
      
      var response = await axios.get(`${this.apiUrl}/api/coach/${encodeURI(name)}/search`,{
        headers:{"Authorization": `Bearer ${this.token}`}
      });
  
      return response.data;
  }

  async getTeamMatches(teamId){
    if (this.token === ""){
      await this.getToken();
    } 
    
    var response = await axios.get(`${this.apiUrl}/api/team/${teamId}/matches`,{
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

  async createCompetition(leagueId, name, ownerId, teamCount, roundCount, competitionType, turnDuration, registrationType, kickOffEvents,autovalidateMatch, aging, enhancement,resurrection,customTeams,mixedTeams,experiencedTeams ){
    let data = {
      "leagueId":leagueId,
      "name":name,
      "ownerId":ownerId,
      "teamCount":teamCount,
      "roundCount":roundCount,
      "competitionType":competitionType,
      "turnDuration": turnDuration,
      "registrationType":registrationType,
      "kickOffEvents": kickOffEvents,
      "autovalidateMatch": autovalidateMatch,
      "aging":aging,
      "enhancement":enhancement,
      "resurrection":resurrection,
      "customTeams":customTeams,
      "mixedTeams":mixedTeams,
      "experiencedTeams":experiencedTeams
    };
    if (this.token === ""){
      await this.getToken();
    }

    var response = await axios.post(`${this.apiUrl}/api/competition`,data,{
      headers:{"Authorization": `Bearer ${this.token}`}
    }).catch((e) => logger.error(e));
    if (!response) return false; // something went wrong
    return response.data;
  }
    
  async inviteTeam(competitionId, ownerId, teamId, coachId){
    if (this.token === ""){
      await this.getToken();
    }

    let data = {competitionId, ownerId,teamId,coachId};
    try{
      let response = await axios.post(`${this.apiUrl}/api/Ticket`,data,{
        headers:{"Authorization": `Bearer ${this.token}`}
      });
      return response.data;
    }catch(ex){
      console.dir('error');
    }
  }

  async addAiTeam(leagueId, competitionId){
    if (this.token === ""){
      await this.getToken();
    }

    try{
      let response = await axios.put(`${this.apiUrl}/api/competition/${competitionId}/${leagueId}/AI`,null,{
        headers:{"Authorization": `Bearer ${this.token}`}
      });
      return response.data;
    }catch(ex){
      console.dir(ex);
    }
  }


  async startCompetition(competitionId){
    if (this.token === ""){
      await this.getToken();
    }

    try{
      let response = await axios.put(`${this.apiUrl}/api/Competition/${competitionId}`,null,{
        headers:{"Authorization": `Bearer ${this.token}`}
      });
      return response.data;
    }catch(ex){
      console.dir(ex);
    }
  }

  async getReplays(){
    let now = new Date(Date.now());
    now.setHours(now.getHours() - 7*24);

    let data = await dataService.getMatches({uuid:{$gt:"1000c5e2a0"},"match.finished":{$gt: now.toJSON()}, saved:{$exists:0}},{projection:{"match.id":1, "match.idcompetition":1,"match.started":1,"match.finished":1, _id:0}});

    data = data.filter(x => x.match.started !== x.match.finished);

    for(const row of data){
      const success = await this.getReplay(row.match.idcompetition, row.match.id);
      if (!success) continue;

      dataService.updateMatch({"match.id":Number(row.match.id)},{$set:{saved:true, filename: `${row.match.id}.bbrz`}});
    }
  }

  async getReplay (competitionId, matchId) {
    try{
      
      if (this.token === ""){
        await this.getToken();
      }

      let response = await axios.get(`${this.apiUrl}/api/competition/${competitionId}`,{
        headers:{"Authorization": `Bearer ${this.token}`}
      });

      let data = response.data;
      if (data.ResponseGetCompetitionData.CompetitionData.Contests.CompetitionContest && !Array.isArray(data.ResponseGetCompetitionData.CompetitionData.Contests.CompetitionContest)){
          data.ResponseGetCompetitionData.CompetitionData.Contests.CompetitionContest = [data.ResponseGetCompetitionData.CompetitionData.Contests.CompetitionContest];
      }

      let id = data.ResponseGetCompetitionData.CompetitionData.Contests.CompetitionContest ? data.ResponseGetCompetitionData.CompetitionData.Contests.CompetitionContest.find(x => 
          x.Matches.RowCompetitionMatch.IdMatchRecord == matchId ).MatchRecords.RowMatchRecord.IdReplayStorage : 0;
      
      if (id === 0 || id === ""){

          response = await axios.get(`${this.apiUrl}/api/match/${matchId}`,{
            headers:{"Authorization": `Bearer ${this.token}`}
          });        

          let hometeamId = response.data.ResponseGetMatchRecordResult.MatchResult.Row.IdTeamListingHome

          response = await axios.get(`${this.apiUrl}/api/team/${hometeamId}/matches`,{
            headers:{"Authorization": `Bearer ${this.token}`}
          });  

          if (response.data.ResponseGetTeamMatchRecords.MatchRecords.RowMatchRecord && !Array.isArray(response.data.ResponseGetTeamMatchRecords.MatchRecords.RowMatchRecord)){
            response.data.ResponseGetTeamMatchRecords.MatchRecords.RowMatchRecord = [response.data.ResponseGetTeamMatchRecords.MatchRecords.RowMatchRecord];
          }

          let match = response.data.ResponseGetTeamMatchRecords.MatchRecords.RowMatchRecord.find(x => x.ID == matchId);
          if (match) id = match.IdReplayStorage;
          else id = 0;
      } 
      if (id && (id != 0 || id != "")){
          response = await axios.get(`${this.apiUrl}/api/replay/${id.replace(/\D/g,"")}`,{
            headers:{"Authorization": `Bearer ${this.token}`},
            responseType: 'arraybuffer'
          }); 

          await fs.writeFile(`./replays/${matchId}.bbrz`, response.data);
          return true;        
      }
    }
    catch(ex){
      logger.information(`can't get replay for ${competitionId} ${matchId}`);
      logger.error(ex);
    }
    return false; 
  };
}

module.exports = new ApiService();
