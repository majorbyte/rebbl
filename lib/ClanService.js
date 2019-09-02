"use strict";
const config = require("./ConfigurationService.js")
, cyanideService = require("./CyanideService.js")
, dataService = require("./DataService.js").rebbl
, teamService = require("./teamservice.js");

class Clan {
  constructor(){
     
  }

  async getClanByUser(name) {
    return await dataService.getClan({active:true, "ledger.teams.coach.name":name});
  }

  async getClanByName(name) {
    return await dataService.getClan({active:true, name:{$regex:new RegExp(`^${name}$`,"i" )}});
  }

  async getClans() {
    return await dataService.getClans({},{projection:{ledger:0,teams:0,powers:0}});
  }

  createClan(name, leader){
    const clan ={
      active: true,
      division:"",
      leader: leader,
      name : name,
      members: [leader],
      powers:[]

    }

    dataService.insertClan(clan);
  }

  setLogo(name, file){
    dataService.updateClan({name:name},{$set:{logo:file}});
  }

  async addTeam(clan, team){

  }

  async getContestData(){
    let season = config.getActiveClanSeason();

    for(var x = 0; x < season.leagues.length;x++){
      let league = season.leagues[x];
      let options = {platform:"pc", league : league.name, status:"*"};
      let contests = await cyanideService.contests(options);
      
      if(!contests.upcoming_matches) continue;

      for(var y = 0; y < contests.upcoming_matches.length;y++){
        let contest = contests.upcoming_matches[y];
        //House 4.15 Game 1 > [4,1,5,1]
        //House 114 Week 1 Match 1 > [1,1,4,1,1]
        let game = contest.competition.replace(/\D/g,"").split("").map(Number);
        if(game.length <3) continue;
        let s = {house:game[2], round:game[1], competition:`Division ${game[0]}`};
        let schedule = await dataService.getSchedule(s);

        let c = schedule.matches.find(x => x.contest_id === contest.contest_id);
        let r1 = new RegExp(/\[(.*)]/);
        let r2 = new RegExp(`^${schedule.home.clan}$`,"i");
        if(!c) {
          schedule.matches.push(contest);
          c= contest;
        } else if(c.status !== contest.status || c.match_id !== contest.match_id){
          c = Object.assign(c, contest);
        }

        if (contest.match_uuid !== null && !c.counted){
          c.counted = true;
          let clan = r1.exec(contest.opponents[0].team.name)[1];
          
          if(contest.opponents[0].team.score > contest.opponents[1].team.score){
            if (r2.test(clan)) {
              schedule.home.score++;
            } else{
              schedule.away.score++;
            }          
          }
          else if(contest.opponents[0].team.score < contest.opponents[1].team.score){
            if (r2.test(clan)) {
              schedule.away.score++;
            } else{
              schedule.home.score++;
            }          
          }
        }
        await dataService.updateScheduleAsync(s,{$set:{matches:schedule.matches,"away.score":schedule.away.score,"home.score":schedule.home.score}});

      };
    }
  }


  async getMatchData(){
    let season = config.getActiveClanSeason();

    let date = new Date(Date.now());
    date.setHours(date.getHours() -12);
    date = `${date.getFullYear()}-${date.getMonth() +1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:00`;

    for(var x = 0; x < season.leagues.length;x++){
      let league = season.leagues[x];
      let matches = await cyanideService.matches({platform:"pc","id_only":1, start:date, league:league.name});

      if (!matches) return;

      matches = matches.matches.map(x => x.uuid);
      let found = await dataService.getMatches({"uuid":{$in:matches}},{"uuid":1});
      found = found.map(f => f.uuid);

      let newMatches = matches.filter(x => !found.includes(x));

      let data = [];
      await Promise.each(newMatches, async id =>{
        let match = await cyanideService.match({match_id: id});
        if(match) data.push(match);
      });

      await Promise.each(data, async m => dataService.insertMatch(m));
      await Promise.each(data, async m => await teamService.updateTeamsAfterMatch(m));

    }

  }

}
if (!Promise.each) Promise.each = async (arr, fn) => {for(const item of arr) await fn(item)}

module.exports = new Clan();