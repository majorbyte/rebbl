"use strict";
const adminBB3Service = require("./adminBB3Service.js");
const adminService = require("./adminBB3Service.js");
const bb3Service = require("./bb3Service.js");
const cyanideService = require("./CyanideService.js");
const diceService = require("./diceService.js");
const dataService = require("./DataServiceBB3.js").rebbl3;


class CreateScheduleService{
  constructor(){
    this.apiUrl = process.env["BB3Url"];
    this.queue = [];

  }

  //314cbc8a-5d6b-11ef-be7b-bc24112ec32e

  async #deleteCompetition(competitionId){
    await fetch(`${this.apiUrl}/api/competition/${competitionId}`,{
      method: "DELETE",
      headers:{"Content-Type":"application/json"},
    });

  }

  #enqueue(id){
    if (this.queue.indexOf(id) === -1) this.queue.push(id);
  }

  #dequeue(){
    if (this.queue.length === 0) return false;
    return this.queue.splice(0,1)[0];
  }


  async queueCompetition(competitionId){
    this.#enqueue(competitionId);
    await dataService.updateCompetition({id:competitionId},{$set:{rollingState: "queued"}});
  }

  async processQueue(){
    let id = this.#dequeue();
    while(id){
      try{
        await dataService.updateCompetition({id:id},{$set:{rollingState: "processing"}});
        await this.rollCompetition(id);
        await dataService.updateCompetition({id:id},{$set:{rollingState: "done"}});
      }
      catch(err){
        console.log(err);
        await dataService.updateCompetition({id:competitionId},{$set:{rollingState: "error"}});
      }
      id = this.#dequeue();
    }
    setTimeout(() => this.processQueue(),60_000);
  }

  async rollCompetition(competitionId){

    try{
      const competition = await dataService.getCompetition({id:competitionId});
      const schedules = await dataService.getSchedules({competitionId: competitionId, round:Number(competition.day)});

      const canAdvance = schedules.every(x => x.status === 3);
      if (!canAdvance) {
        console.log("Unable to advance");
        return;
      }
      
      const nameEx = new RegExp(`R${competition.day}`,"i");

      let workingCompetitionId = competitionId;
      const childCompetition = await dataService.getCompetition({parentId:competitionId,name:{"$regex": nameEx}})
      if (childCompetition) workingCompetitionId = childCompetition.id;

      await this.#deleteCompetition(workingCompetitionId);

      const round = Number(competition.day)+1;
      await dataService.updateCompetition({id:competitionId},{$set:{day: round }});

      //update round

      const newCompetitionId = await this.create(competitionId);

      await this.swap(competitionId,newCompetitionId,0);

    } catch(err){
      console.dir(err);
    }

  }

  delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  async create(competitionId){

    // create competition

    const competition = await dataService.getCompetition({id:competitionId});

    const startingTeam = "767e598f-5b23-11ef-be7b-bc24112ec32e";

    const schedulingTeams = ["78afc86a-5ff5-11ef-be7b-bc24112ec32e","c365d109-5ff0-11ef-be7b-bc24112ec32e","17f6b021-5972-11ef-be7b-bc24112ec32e","82835b85-597c-11ef-be7b-bc24112ec32e","f88ef301-5d6c-11ef-be7b-bc24112ec32e","54f6be19-5d6c-11ef-be7b-bc24112ec32e","7bd80607-5d8a-11ef-be7b-bc24112ec32e","a43a3c9f-5d6a-11ef-be7b-bc24112ec32e","58cd103c-597b-11ef-be7b-bc24112ec32e","74f73ae3-4f25-11ef-be7b-bc24112ec32e","88edc483-5967-11ef-be7b-bc24112ec32e"];

    let response = await fetch(`${this.apiUrl}/api/competition`,{
      method: "POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        name: `${competition.name} R${competition.day}`,
        competitionFormat: 2,
        leagueId:"94f0d3aa-e9ba-11ee-a745-02000090a64f"
      })
    });

    if (!response.ok) throw new Error("Could not create competition");

    let result = await response.json();
    
    const settingId = result.responseCreateCompetition.competition.settingId;
    const newCompetitionId = result.responseCreateCompetition.competition.id;
    const timer = competition.timer || 1;
    const participants = competition.standings.length;

    await fetch(`${this.apiUrl}/api/competition/${settingId}/participants/${participants}`,{
      method: "PUT",
      headers:{"Content-Type":"application/json"}
    });

    await fetch(`${this.apiUrl}/api/competition/${settingId}/timer/${timer}`,{
      method: "PUT",
      headers:{"Content-Type":"application/json"}
    });

    await fetch(`${this.apiUrl}/api/competition/${settingId}/automaticAdvancement`,{
      method: "DELETE",
      headers:{"Content-Type":"application/json"}
    });

    await fetch(`${this.apiUrl}/api/competition/${settingId}/password/%20`,{
      method: "PUT",
      headers:{"Content-Type":"application/json"}
    });

    await fetch(`${this.apiUrl}/api/competition/${settingId}/admissionMode/${3}`,{
      method: "PUT",
      headers:{"Content-Type":"application/json"}
    });

    await fetch(`${this.apiUrl}/api/competition/${settingId}/contestFormat/${1}`,{
      method: "PUT",
      headers:{"Content-Type":"application/json"}
    });

    await dataService.updateCompetition({id:competitionId},{$set:{rollingState: "processing - competition created"}});

    response = await fetch(`${this.apiUrl}/api/competition/${newCompetitionId}`);

    const data = await response.json();

    const newCompetition = {
      id: data.responseGetCompetition.competition.id,
      parentId: competitionId,
      name: data.responseGetCompetition.competition.name,
      day: Number(data.responseGetCompetition.competition.day),
      status : Number(data.responseGetCompetition.competition.status),
      format: Number(data.responseGetCompetition.competition.format),
      logo: data.responseGetCompetition.competition.logo,
      boardId: data.responseGetCompetition.competition.boardId,
      leagueId: "94f0d3aa-e9ba-11ee-a745-02000090a64f",
    }

    await dataService.updateCompetition({id:newCompetition.id},newCompetition,{upsert:true});

    const cookie = await adminService.setCompetitionToAdmin(null, newCompetitionId);

    await adminBB3Service.setAutomaticMatchValidation(cookie, false);

    for(let x = 0; x < participants-1;x++){
      await this.delay(500);
      
      response = await fetch(`${this.apiUrl}/api/competition/${newCompetitionId}/team/${startingTeam}`,{
        method: "PUT",
        headers:{"Content-Type":"application/json"}
      });

      await this.delay(500);

      await adminService.replaceTeam(cookie, startingTeam, schedulingTeams[x]);

      await dataService.updateCompetition({id:competitionId},{$set:{rollingState: `processing - added scheduling team ${1+x}/${participants}`}});
    }

    response = await fetch(`${this.apiUrl}/api/competition/${newCompetitionId}/team/${startingTeam}`,{
      method: "PUT",
      headers:{"Content-Type":"application/json"}
    });

    await fetch(`${this.apiUrl}/api/competition/${newCompetitionId}/begin`,{method:"POST"});

    await dataService.updateCompetition({id:competitionId},{$set:{rollingState: `processing - competition started`}});

    console.log(newCompetitionId);
    return newCompetitionId;
  }

  async swap(competitionId, newCompetitionId){
    const competition = await dataService.getCompetition({id:competitionId});

    const response = await fetch(`${this.apiUrl}/api/competition/schedule/${newCompetitionId}/1`);
    
    if (!response.ok) return;
    const data = await response.json();
    
    const existingSchedules = await dataService.getSchedules({competitionId:competitionId, round:competition.day});

    const cookie = await adminService.setCompetitionToAdmin(null, newCompetitionId);

    const schedules = data.responseGetCompetitionSchedule.schedule.contest; 
    for(let x = 0;x < schedules.length;x++  ){
      const existingSchedule = existingSchedules[x];
      const schedule = schedules[x];

      console.log(`replace home ${schedule.matches.match.homeTeam.name} with ${existingSchedule.home.team.name}`);
      console.log(`replace away ${schedule.matches.match.awayTeam.name} with ${existingSchedule.away.team.name}`);

      await adminService.replaceTeam(cookie, schedule.matches.match.homeTeam.id, existingSchedule.home.team.id);
      await this.delay(500);
      await adminService.replaceTeam(cookie, schedule.matches.match.awayTeam.id, existingSchedule.away.team.id);
      await this.delay(500);
      await dataService.updateCompetition({id:competitionId},{$set:{rollingState: `processing - schedule ${1+x}`}});
    }
  }

}


module.exports = new CreateScheduleService();
