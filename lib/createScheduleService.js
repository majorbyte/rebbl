"use strict";
const adminBB3Service = require("./adminBB3Service.js");
const adminService = require("./adminBB3Service.js");
const dataService = require("./DataServiceBB3.js").rebbl3;
const configuration = require("./ConfigurationService.js");


class CreateScheduleService{
  constructor(){
    this.apiUrl = process.env["BB3Url"];
    this.queue = [];
    this.schedulingTeams = [
      {'teamId':'78afc86a-5ff5-11ef-be7b-bc24112ec32e','coachId':'92f20139-3a0e-11ee-af36-020000a4d571'},
      {'teamId':'c365d109-5ff0-11ef-be7b-bc24112ec32e','coachId':'153e5040-b16e-11ed-b1d4-020000a4d571'},
      {'teamId':'82835b85-597c-11ef-be7b-bc24112ec32e','coachId':'0434ce00-b144-11ed-80a8-020000a4d571'},
      {'teamId':'17f6b021-5972-11ef-be7b-bc24112ec32e','coachId':'20dafc2c-b23a-11ed-8c21-020000a4d571'},
      {'teamId':'f88ef301-5d6c-11ef-be7b-bc24112ec32e','coachId':'b90987cc-b132-11ed-80a8-020000a4d571'},
      {'teamId':'7736ca5e-7367-11ef-be7b-bc24112ec32e','coachId':'8411d13d-b1d0-11ed-b1d4-020000a4d571'},
      {'teamId':'58cd103c-597b-11ef-be7b-bc24112ec32e','coachId':'a12132f1-1b47-11ee-8d38-020000a4d571'},
      {'teamId':'74f73ae3-4f25-11ef-be7b-bc24112ec32e','coachId':'78ec9387-b144-11ed-80a8-020000a4d571'},
      {'teamId':'7bd80607-5d8a-11ef-be7b-bc24112ec32e','coachId':'6aa3c242-5d8a-11ef-be7b-bc24112ec32e'},
      {'teamId':'54f6be19-5d6c-11ef-be7b-bc24112ec32e','coachId':'c194b43f-b140-11ed-80a8-020000a4d571'},
      {'teamId':'88edc483-5967-11ef-be7b-bc24112ec32e','coachId':'b84281b3-b1da-11ed-b1d4-020000a4d571'}    
    ];
  }

  //314cbc8a-5d6b-11ef-be7b-bc24112ec32e

  async #deleteCompetition(competitionId){
    console.log(`url: ${this.apiUrl}`);
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
      configuration.blockUpdates();
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
    configuration.allowUpdates();
    setTimeout(() => {this.processQueue()},60_000);
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
      const childCompetition = await dataService.getCompetitions({parentId:competitionId,name:{"$regex": nameEx}});
      if (childCompetition.length > 0) workingCompetitionId = childCompetition[childCompetition.length-1].id;
      

      await this.#deleteCompetition(workingCompetitionId);

      const round = Number(competition.day)+1;
      await dataService.updateCompetition({id:competitionId},{$set:{day: round }});

      //update round

      const newCompetitionId = await this.create(competitionId);

      await this.populate(competitionId, newCompetitionId);

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
    const schedules = await dataService.getSchedules({competitionId: competitionId, round:Number(competition.day)});


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
    const participants = schedules.length *2;

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

    await fetch(`${this.apiUrl}/api/competition/${settingId}/playerValidation`,{
      method: "PUT",
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


    console.log(newCompetitionId);
    return newCompetitionId;
  }

  async populate(competitionId, newCompetitionId){
    const competition = await dataService.getCompetition({id:competitionId});
    const schedules = await dataService.getSchedules({competitionId: competitionId, round:Number(competition.day)});
    const participants = schedules.length *2;

    const startingTeam = "767e598f-5b23-11ef-be7b-bc24112ec32e";

    const availableTeams = this.schedulingTeams.filter(team => !schedules.some(x => team.coachId === x.away.coach.id || team.coachId === x.home.coach.id ));

    const cookie = await adminService.setCompetitionToAdmin(null, newCompetitionId);

    await adminBB3Service.setAutomaticMatchValidation(cookie, false);

    let response;
    for(let x = 0; x < participants-1;x++){
      await this.delay(500);
      
      response = await fetch(`${this.apiUrl}/api/competition/${newCompetitionId}/team/${startingTeam}`,{
        method: "PUT",
        headers:{"Content-Type":"application/json"}
      });

      await this.delay(1000);

      await adminService.replaceTeam(cookie, startingTeam, availableTeams[x].teamId);

      await dataService.updateCompetition({id:competitionId},{$set:{rollingState: `processing - added scheduling team ${1+x}/${participants}`}});
    }

    response = await fetch(`${this.apiUrl}/api/competition/${newCompetitionId}/team/${startingTeam}`,{
      method: "PUT",
      headers:{"Content-Type":"application/json"}
    });

    await fetch(`${this.apiUrl}/api/competition/${newCompetitionId}/begin`,{method:"POST"});

    await dataService.updateCompetition({id:competitionId},{$set:{rollingState: `processing - competition started`}});
  }

  async swap(competitionId, newCompetitionId, retry){
    const competition = await dataService.getCompetition({id:competitionId});

    let response = await fetch(`${this.apiUrl}/api/competition/schedule/${newCompetitionId}/1`);
    
    if (!response.ok) return;
    let data = await response.json();
    
    const existingSchedules = await dataService.getSchedules({competitionId:competitionId, round:competition.day});

    const cookie = await adminService.setCompetitionToAdmin(null, newCompetitionId);

    const schedules = data.responseGetCompetitionSchedule.schedule.contest; 
    for(let x = 0;x < schedules.length;x++  ){
      const existingSchedule = existingSchedules[x];
      const schedule = schedules[x];

      console.log(`replace home ${schedule.matches.match.homeTeam.name} with ${existingSchedule.home.team.name}`);
      console.log(`replace away ${schedule.matches.match.awayTeam.name} with ${existingSchedule.away.team.name}`);

      if (schedule.matches.match.homeTeam.id !== existingSchedule.home.team.id){
        await adminService.replaceTeam(cookie, schedule.matches.match.homeTeam.id, existingSchedule.home.team.id);
        await this.delay(500);
      }
      if(schedule.matches.match.awayTeam.id !== existingSchedule.away.team.id){
        await adminService.replaceTeam(cookie, schedule.matches.match.awayTeam.id, existingSchedule.away.team.id);
        await this.delay(500);
      }
      await dataService.updateCompetition({id:competitionId},{$set:{rollingState: `processing - schedule ${1+x}`}});
    }

    response = await fetch(`${this.apiUrl}/api/competition/schedule/${newCompetitionId}/1`);
    data = await response.json();

    const moreToDo = data.responseGetCompetitionSchedule.schedule.contest.some(schedule => this.schedulingTeams.indexOf(schedule.matches.match.homeTeam.id) > -1 || this.schedulingTeams.indexOf(schedule.matches.match.awayTeam.id) > -1 );
    if (moreToDo && !retry) await this.swap(competitionId,newCompetitionId,true);

  }

}


module.exports = new CreateScheduleService();
