"use strict";
const config = require("./ConfigurationService.js")
, cyanideService = require("./CyanideService.js")
, dataService = require("./DataService.js").rebbl
, datingService = require("./DatingService")
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
    const r1 = new RegExp(/\[(.*?)]/);

    for(var x = 0; x < season.leagues.length;x++){
      let league = season.leagues[x];
      let options = {platform:"pc", league : league.name, status:"*"};
      let contests = await cyanideService.contests(options);
      
      if(!contests.upcoming_matches) continue;

      for(let contest of contests.upcoming_matches){
        //House 4.15 Game 1 > [4,1,5,1]
        //House 114 Week 1 Match 1 > [1,1,4,1,1]
        let game = contest.competition.replace(/\D/g,"").split("").map(Number);
        if(game.length <3) continue;
        let s = {house:game[2], round:game[1], competition:`Division ${game[0]}`};
        let schedule = await dataService.getSchedule(s);

        let c = schedule.matches.find(x => x.contest_id === contest.contest_id);
        let r2 = new RegExp(`^${schedule.home.clan}$`,"i");
        if(!c) {
          schedule.matches.push(contest);
          c= contest;
        } else if(c.status !== contest.status || c.match_id !== contest.match_id){
          c = Object.assign(c, contest);
        }

        if (contest.match_uuid !== null && !c.counted){
          c.counted = true;
          datingService.removeDate(c.contest_id)
          
          if (r1.test(contest.opponents[0].team.name)){
            let clan = r1.exec(contest.opponents[0].team.name)[1];
          
            if(contest.opponents[0].team.score > contest.opponents[1].team.score){
              //If the match home team equals schedule home team 
              if (r2.test(clan)) {
                schedule.home.score++;
              } else{
                schedule.away.score++;
              }          
            }
            else if(contest.opponents[0].team.score < contest.opponents[1].team.score){
              //If the match home team equals schedule home team 
              if (r2.test(clan)) {
                schedule.away.score++;
              } else{
                schedule.home.score++;
              }          
            }
          } else {
            let clan = r1.exec(contest.opponents[1].team.name)[1];
            
            if(contest.opponents[1].team.score > contest.opponents[0].team.score){
              //If the match away team equals schedule home team 
              if (r2.test(clan)) {
                schedule.home.score++;
              } else{
                schedule.away.score++;
              }          
            }
            else if(contest.opponents[1].team.score < contest.opponents[0].team.score){
              //If the match away team equals schedule home team 
              if (r2.test(clan)) {
                schedule.away.score++;
              } else{
                schedule.home.score++;
              }          
            }
          }
        }
        await dataService.updateScheduleAsync(s,{$set:{matches:schedule.matches,"away.score":schedule.away.score,"home.score":schedule.home.score}});
      }
    }
  }

  async getMatchData(uuid){
    let season = config.getActiveClanSeason();

    let date = new Date(Date.now());
    date.setHours(date.getHours() - 8);
    date = `${date.getFullYear()}-${date.getMonth() +1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:00`;

    let newMatches =[];
    if(uuid){
      let found = await dataService.getMatches({"uuid":uuid},{"uuid":1});
      if(found.length === 0) newMatches.push(uuid);
    } else {
      let leagueParameter = [];
      season.leagues.map(league => leagueParameter.push(league.name));
      
      let matches = await cyanideService.matches({platform:"pc","id_only":1,limit:20, order:"finished", start:date, league:leagueParameter.join(",")});
  
      if (!matches) return;
  
      matches = matches.matches.map(x => x.uuid);
      let found = await dataService.getMatches({"uuid":{$in:matches}},{"uuid":1});
      found = found.map(f => f.uuid);
      newMatches = matches.filter(x => !found.includes(x));
    }

    let data = [];
    await Promise.each(newMatches, async id =>{
      let match = await cyanideService.match({match_id: id});
      if(match) data.push(match);
    });

    await Promise.each(data, async m => dataService.insertMatch(m));
    await Promise.each(data, async m => await teamService.updateTeamsAfterMatch(m));


  }

    async calculateStandings(){
    let schedules = await dataService.getSchedules({league:"clan",season:"season 7"});

    const newScore = function(clan,division){
      return {
        league:"clan",
        division:division,
        season:"season 7",
        clan:clan,
        clanWins:0,
        clanLosses:0,
        matchWins:0,
        matchLosses:0,
        tdFor:0,
        tdAgainst:0,
        tdDiff:0
      }
    }
  
    let scores = [];
    for(var x=0; x < schedules.length;x++){
      let schedule = schedules[x];
  
      let home = scores.find(x => x.clan === schedule.home.clan);
      if (!home) {
        home = newScore(schedule.home.clan,schedule.competition);
        scores.push(home);
      } 
  
      let away = scores.find(x => x.clan === schedule.away.clan);
      if (!away) {
        away = newScore(schedule.away.clan,schedule.competition);
        scores.push(away);
      } 
  
  
      if(schedule.home.score > 2){
        home.clanWins++;
        away.clanLosses++;
      } if(schedule.away.score > 2){
        away.clanWins++;
        home.clanLosses++;
      }
  
      let r1 = new RegExp(/\[(.*?)]/);
      let r2 = new RegExp(`^${schedule.home.clan}$`,"i");
  
      schedule.matches.map(match =>{
        if (r1.test(match.opponents[0].team.name)){
          let clan = r1.exec(match.opponents[0].team.name)[1];
          if(match.opponents[0].team.score > match.opponents[1].team.score){
            if (r2.test(clan)) {
              home.matchWins++;
              away.matchLosses++;
            } else{
              away.matchWins++;
              home.matchLosses++;
            }          
          }
          else if(match.opponents[0].team.score < match.opponents[1].team.score){
            if (r2.test(clan)) {
              away.matchWins++;
              home.matchLosses++;
            } else{
              home.matchWins++;
              away.matchLosses++;
            }          
          }
    
          if (r2.test(clan)) {
            home.tdFor += match.opponents[0].team.score;
            home.tdAgainst += match.opponents[1].team.score;
            home.tdDiff = home.tdFor - home.tdAgainst;
    
            away.tdFor += match.opponents[1].team.score;
            away.tdAgainst += match.opponents[0].team.score;
            away.tdDiff = away.tdFor - away.tdAgainst;
          } else{
            home.tdFor += match.opponents[1].team.score;
            home.tdAgainst += match.opponents[0].team.score;
            home.tdDiff = home.tdFor - home.tdAgainst;
    
            away.tdFor += match.opponents[0].team.score;
            away.tdAgainst += match.opponents[1].team.score;
            away.tdDiff = away.tdFor - away.tdAgainst;
          }          
  
        } else {
          let clan = r1.exec(match.opponents[1].team.name)[1];
          if(match.opponents[1].team.score > match.opponents[0].team.score){
            if (r2.test(clan)) {
              home.matchWins++;
              away.matchLosses++;
            } else{
              away.matchWins++;
              home.matchLosses++;
            }          
          }
          else if(match.opponents[1].team.score < match.opponents[0].team.score){
            if (r2.test(clan)) {
              away.matchWins++;
              home.matchLosses++;
            } else{
              home.matchWins++;
              away.matchLosses++;
            }          
          }
    
          if (r2.test(clan)) {
            home.tdFor += match.opponents[1].team.score;
            home.tdAgainst += match.opponents[0].team.score;
            home.tdDiff = home.tdFor - home.tdAgainst;
    
            away.tdFor += match.opponents[0].team.score;
            away.tdAgainst += match.opponents[1].team.score;
            away.tdDiff = away.tdFor - away.tdAgainst;
          } else{
            home.tdFor += match.opponents[0].team.score;
            home.tdAgainst += match.opponents[1].team.score;
            home.tdDiff = home.tdFor - home.tdAgainst;
    
            away.tdFor += match.opponents[1].team.score;
            away.tdAgainst += match.opponents[0].team.score;
            away.tdDiff = away.tdFor - away.tdAgainst;
          }          
        }
  
      });
  
  
    }
    scores = scores.sort((a,b) => {
      if(a.division > b.division) return 1;
      if(a.division < b.division) return -1;
  
      if(a.clanWins > b.clanWins) return -1;
      if(a.clanWins < b.clanWins) return 1;
      
      if(a.matchWins - a.matchLosses > b.matchWins - b.matchLosses) return -1;
      if(a.matchWins - a.matchLosses < b.matchWins - b.matchLosses) return 1;
  
      if(a.tdDiff > b.tdDiff) return -1;
      if(a.tdDiff < b.tdDiff) return 1;
  
      let schedule = schedules.find(x => {
        if (x.home.clan === a.clan && x.away.clan === b.clan) return true;
        if (x.home.clan === b.clan && x.away.clan === a.clan) return true;
        return false;
      });
  
      if (schedule){
        if (schedule.home.clan === a && schedule.home.score > schedule.away.score) return -1;
        if (schedule.away.clan === a && schedule.away.score > schedule.home.score) return -1;
        return 1;
      }
      return 0;
    })
    await dataService.removeStandings({league:"clan",season:"season 7"});

    dataService.insertStandings(scores);
  }

  async newBlood(clanName,teamId,newTeamName){
    let newTeam = await cyanideService.team({platform:"pc",name:newTeamName});
    if (!newTeam) return;
    newTeam.active = true;

    let clan = await dataService.getClan({name:clanName});
    if(!clan) return

    let team = clan.ledger.teams.find(x => x.team.id === teamId);

    clan.teams.splice(clan.teams.findIndex(x=> x.toLowerCase() ===  team.team.name.toLowerCase()),1);
    clan.teams.push(newTeam.team.name);

    dataService.updateClan({name:clanName},{$push:{"ledger.teams":newTeam},$set:{teams:clan.teams}});
    
    dataService.updateClan({name:clanName, "ledger.teams.team.id":teamId},{$set:{"ledger.teams.$.active":false}});

    teamService.updateTeams(newTeam.team.id);
  }

  async newCoach(clanName,teamId,newTeamName){
    let newTeam = await cyanideService.team({platform:"pc",name:newTeamName});
    if (!newTeam) return;
    newTeam.active = true;

    let clan = await dataService.getClan({name:clanName});
    if(!clan) return;

    let team = clan.ledger.teams.find(x => x.team.id === teamId);

    clan.teams.splice(clan.teams.findIndex(x=> x.toLowerCase() ===  team.team.name.toLowerCase()),1);
    clan.teams.push(newTeam.team.name);


    let member = {coach: newTeam.coach.name, coachId: newTeam.coach.id, reddit:""};
    let name = new RegExp(`^${newTeam.coach.name}$`,"i");
    let account = await dataService.getAccount({coach:name})
    if(account) member.reddit = account.reddit;
    
    clan.members.splice(clan.members.findIndex(x=> x.coach.toLowerCase() ===  team.team.name.toLowerCase()),1);
    clan.members.push(member);

    dataService.updateClan({name:clanName},{$push:{"ledger.teams":newTeam},$set:{teams:clan.teams, members:clan.members}});
    
    dataService.updateClan({name:clanName, "ledger.teams.team.id":teamId},{$set:{"ledger.teams.$.active":false}});

    teamService.updateTeams(newTeam.team.id);
  }

}
if (!Promise.each) Promise.each = async (arr, fn) => {for(const item of arr) await fn(item)}

module.exports = new Clan();