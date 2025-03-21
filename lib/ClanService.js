"use strict";
const config = require("./ConfigurationService.js")
, cyanideService = require("./CyanideService.js")
, diceService = require('./diceService.js')
, dataService = require("./DataService.js").rebbl
, datingService = require("./DatingService")
, teamService = require("./teamservice.js");

class Clan {
  constructor(){
    this.apiUrl = process.env["BB3Url"];
    this.leagueId = "05004f31-9d5a-11ef-aaf1-bc24112ec32e";

    this.currentSeason = 19;
    this.season = `season ${this.currentSeason}`;
  }
  async init(socket){
    this.socket = socket;
  }

  //new RegExp(`^${req.query.coach.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,'i')
  async getNewClanByUser(name) {
    let clan = await dataService.getClan({season:this.season, "members.coach":new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,'i')});
    if (!clan) clan = await dataService.getClan({season:this.season, "leader":new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,'i')});
    return clan
  }

  async getNewClanByName(name) {
    let clan = await dataService.getClan({season:this.season, "name":new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,'i')});
    return clan
  }

  async getClanByUser(name) {
    return await dataService.getClan({active:true, "ledger.teams.coach.name":name});
  }
  async getClanByLeader(name) {
    return await dataService.getClan({active:true, "leader":name});
  }

  async getClanByName(name) {
    return await dataService.getClan({active:true, name:{$regex:new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,"i" )}});
  }
  async getClanByNameAndSeason(name,season) {
    return await dataService.getClan({season:season, name:{$regex:new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,"i" )}});
  }

  async getClans() {
    return await dataService.getClans({active:true},{projection:{ledger:0,teams:0,powers:0}});
  }

  createClan (name, leader){
    const clan ={
      active: true,
      division: "Division 1",
      leader: leader.coach,
      name : name,
      members: [leader],
      season:this.season,
      ledger:{
        miscommunication : 0,
        badInducementDeal : 0,
        lastMinuteSwitch : 0,
        assassination : 0,
        inspiration : 0,
        confusion : 0,
        hatredOfPublicTransport : 0,
        financialFairPlay : 0,
        stuntyMiscommunication : 0,
        stuntyLastMinuteSwitch : 0,
        stuntyAssassination : 0,
        stuntyInspiration : 0,
        stuntyBadInducementDeal : 0,
        stuntyConfusion : 0,
        stuntyHatredOfPublicTransport : 0,
        emergencyRnR : 0,
        emergencyIntensiveCare : 0,
        newBlood : 0,
        bloodSacrifice : 0,
        teams : [],
        teamBuilding : [{coach:leader.coach,name:'',id:1},{name:'',id:2},{name:'',id:3},{name:'',id:4},{name:'',id:5}]
      }
    };

    dataService.insertClan(clan);
    return clan;
  }

  async _correctDicerolls(team){
    const SPP = [
      {level:1,	spp:0, eligible:3},
      {level:2,	spp:6, eligible:11},
      {level:3,	spp:16, eligible:23},
      {level:4,	spp:31, eligible:41},
      {level:5,	spp:51, eligible:63},
      {level:6,	spp:76, eligible:126}
    ];

    for(let player of team.roster.filter(player => player.dice)) {
      const playerLastSeason = await dataService.getPlayer({id:player.id});
      
      if (playerLastSeason.level !== player.level) continue;

      const nextSPP = SPP.find(x => x.level === playerLastSeason.level+1);
      const requiredSPP = nextSPP.spp - playerLastSeason.xp;

      player.level = nextSPP.level;
      player.xp = nextSPP.spp;
      player.sppSurplus = 0;
      player.spentSPP = requiredSPP;
    }
  }

  async lockClan(clan){
    dataService.updateClan({name:clan, season:this.season},{$set:{locked:true}});
  }

  async updateClan(newClanData, clan){
    for(let team of newClanData.ledger.teamBuilding){
      await this._correctDicerolls(team);
    }
    dataService.updateClan({_id:clan._id},newClanData);
    this.socket.in(newClanData.name).emit('clan',JSON.stringify(newClanData));
  }

  async updateTeam(teamId, newTeam, emit, clan){
    const index = clan.ledger.teamBuilding.findIndex(x => x.id === teamId);

    await this._correctDicerolls(newTeam);

    clan.ledger.teamBuilding[index] = newTeam;

    dataService.updateClan({_id:clan._id},clan,{upsert:true,writeconcern:{w:1}});

    if (emit) this.socket.in(clan.name).emit('team',JSON.stringify(newTeam));

  }
  async updateMembers(members, clan){
    dataService.updateClan({_id:clan._id},{$set:{members:members}});
  }

  async skillPlayer(clanName, teamId, newPlayer ){
    const SPP = [
      {level:1,	spp:0, eligible:3},
      {level:2,	spp:6, eligible:11},
      {level:3,	spp:16, eligible:23},
      {level:4,	spp:31, eligible:41},
      {level:5,	spp:51, eligible:63},
      {level:6,	spp:76, eligible:126},
      {level:7,	spp:176, eligible:999}
    ];

    const clan = await dataService.getClan({season:this.season, name:clanName});
    if (!clan) throw new Error('Clan not found.');

    const team = clan.ledger.teamBuilding.find(x => x.id === teamId);
    if (!team) throw new Error('Team not found.');

    const player = await dataService.getPlayer({id: Number(newPlayer.id)});
    if (!player) throw new Error('Player not found.');

    if (player.diceRoll) throw new Error('Player has already been skilled.');
    const spp = SPP.find(x => x.level === player.level);

    const levelEligible = player.xp >= spp.eligible;
    if (!levelEligible) throw new Error('Player is not eligable');

    const sppSurplus = team.roster.reduce((p,c) => {
      if (c.id === newPlayer.id) return p;
      const spp = SPP.find(x => x.level === c.level);
      return p + Math.max(c.xp - spp.spp,0);
    },0);

    const spentSPP = team.roster.reduce((p,c) => {
      if (c.id === newPlayer.id) return p;
      if (!c.spentSPP) return p;
      return p + c.spentSPP;
    },0);
    
    const nextSPP = SPP.find(x => x.level === player.level+1);
    
    const requiredSPP = nextSPP.spp - player.xp;
    if ((sppSurplus - spentSPP) < requiredSPP) throw new Error('Not enough SPP available');

    const [d1,d2] = await Promise.all([diceService.roll(6),diceService.roll(6)]);

    const playerIndex = team.roster.findIndex(x => x.id === player.id);

    const index = clan.ledger.teamBuilding.findIndex(x => x.id === teamId);
    clan.ledger.teamBuilding[index].roster[playerIndex].dice = [d1,d2];
    clan.ledger.teamBuilding[index].roster[playerIndex].level = nextSPP.level;
    clan.ledger.teamBuilding[index].roster[playerIndex].xp = nextSPP.spp;
    clan.ledger.teamBuilding[index].roster[playerIndex].sppSurplus = 0;
    clan.ledger.teamBuilding[index].roster[playerIndex].spentSPP = requiredSPP;
    


    player.diceRoll = {dice: [d1,d2], date:Date.now(), clan:clanName};
    dataService.updateClan({_id:clan._id},clan,{upsert:true});
    dataService.updatePlayer({_id:player._id}, {$set:{diceRoll:{dice: [d1,d2], date:Date.now(), clan:clanName, season:this.season}}})

    return clan.ledger.teamBuilding[index].roster[playerIndex];
  }

  async setLogo(name, file){
    dataService.updateClan({name:name, active:true},{$set:{logo:file}});
  }

  async newBlood(clanName,teamId,newTeamName){
    let newTeam = await cyanideService.team({platform:"pc",name:newTeamName});
    if (!newTeam) return;
    newTeam.active = true;

    let clan = await dataService.getClan({name:clanName, active:true});
    if(!clan) return;

    let team = clan.ledger.teams.find(x => x.team.id === teamId);

    clan.teams.splice(clan.teams.findIndex(x=> x.toLowerCase() === team.team.name.toLowerCase()),1);
    clan.teams.push(newTeam.team.name);

    dataService.updateClan({name:clanName, active:true},{$push:{"ledger.teams":newTeam},$set:{teams:clan.teams}});
    
    dataService.updateClan({name:clanName, active:true, "ledger.teams.team.id":teamId},{$set:{"ledger.teams.$.active":false, "powers.newBlood":0 }});

    teamService.updateTeams(newTeam.team.id);
  }

  async updateTeams(){
    const teams = await dataService.getTeams({"team.name":/S19$/});

    for(const team of teams){
      teamService.updateTeams(team.team.id);
    }
  }

  async getContestData(clean){
    let requestCount = 0;
    const r1 = new RegExp(/\[(.*?)]/);

    /*
    let options = {platform:"pc", league : "05004f31-9d5a-11ef-aaf1-bc24112ec32e"};
    let data = await cyanideService.competitions(options);
    requestCount++;
    if(!data?.competitions) return;
    */
    let jsonResponse = await fetch(`${this.apiUrl}/api/league/${this.leagueId}/competitions/50/0`);
    if (!jsonResponse.ok) return;

    let data = await jsonResponse.json(); 
    let competitionIds = data.responseGetCompetitions.competitions.competition.filter(x => x.status > 1).map(x => x.id);
    let unstartedCompetitions = data.responseGetCompetitions.competitions.competition.filter(x => x.status == 1);
    
    let cnt = 50;
    while (Number(data.responseGetCompetitions.page) < Number(data.responseGetCompetitions.nbPages)){
      jsonResponse = await fetch(`${this.apiUrl}/api/league/${this.leagueId}/competitions/50/${cnt}`);

      data = await jsonResponse.json(); 
      competitionIds = competitionIds.concat(data.responseGetCompetitions.competitions.competition.filter(x => x.status > 1).map(x => x.id));
      unstartedCompetitions = unstartedCompetitions.concat(data.responseGetCompetitions.competitions.competition.filter(x => x.status == 1));
      cnt += 50;
    }

    for(let id of competitionIds){

      let options = {platform:"pc", competition : id, contest_status:"*"};
      let response = await cyanideService.contests(options);
      const contest = response.contests[0];

      //House 4.15 Game 1 > [4,1,5,1]
      //House 114 Week 1 Match 1 > [1,1,4,1,1]
      let game = contest.competition.match(/[0-9]+/g).map(Number);
      if(game.length <3) continue;

      let s = {house:game[2], round:game[1], competition:`Division ${game[0]}`, season:this.season};

      let schedule = await dataService.getSchedule(s);

      // because"competition": "Re-MNG 9 & 10", results in 910
      if (!schedule) continue;

      let c = schedule.matches.find(x => x.contest_id === contest.contest_id);
      if (!contest.opponents) continue;
      let r2 = new RegExp(`^${schedule.home.clan}$`,"i");

      if(!c) {
        schedule.matches.push(contest);
        c= contest;

        if (schedule.unstarted) schedule.unstarted.splice(schedule.unstarted.findIndex(x => x.competitionId === contest.competition_id),1);

      } else if(c.status !== contest.status || c.match_id !== contest.match_id){
        c = Object.assign(c, contest);
      }
      if (contest.match_status === "Validated" && !c.counted){
        c.counted = true;
        datingService.removeDate(c.contest_id);
        
        if (r1.test(contest.opponents[0].team.name)){
          let clan = r1.exec(contest.opponents[0].team.name)[1];
        
          if(contest.opponents[0].team.score > contest.opponents[1].team.score){
            //If the match home team equals schedule home team 
            if (r2.test(clan)) {
              schedule.home.win++;
              schedule.away.loss++;
            } else{
              schedule.away.win++;
              schedule.home.loss++;
            }          
          } else if(contest.opponents[0].team.score < contest.opponents[1].team.score){
            //If the match home team equals schedule home team 
            if (r2.test(clan)) {
              schedule.away.win++;
              schedule.home.loss++;
            } else{
              schedule.home.win++;
              schedule.away.loss++;
            }          
          } else{
            schedule.home.draw++;
            schedule.away.draw++;
          }
        } else if (r1.test(contest.opponents[1].team.name)){
          let clan = r1.exec(contest.opponents[1].team.name)[1];
          
          if(contest.opponents[1].team.score > contest.opponents[0].team.score){
            //If the match away team equals schedule home team 
            if (r2.test(clan)) {
              schedule.home.win++;
              schedule.away.loss++;
            } else{
              schedule.away.win++;
              schedule.home.loss++;
            }          
          } else if(contest.opponents[1].team.score < contest.opponents[0].team.score){
            //If the match away team equals schedule home team 
            if (r2.test(clan)) {
              schedule.away.win++;
              schedule.home.loss++;
            } else{
              schedule.home.win++;
              schedule.away.loss++;
            }          
          } else{
            schedule.home.draw++;
            schedule.away.draw++;
          }
        }
        await dataService.updateScheduleAsync(s,{$set:{"away":schedule.away,"home":schedule.home}});
      }
      await dataService.updateScheduleAsync(s,{$set:{matches:schedule.matches, unstarted:schedule.unstarted}});

      if (contest.match_status === "Validated" && c.counted && clean){
        await fetch(`${this.apiUrl}/api/competition/${contest.competition_id}`,{
          method: "DELETE",
          headers:{"Content-Type":"application/json"},
        });
      }
    }

    const unstarted = [];
    for(const competition of unstartedCompetitions){
      let game = competition.name.match(/[0-9]+/g)?.map(Number);
      if (game && game.length >= 3 &&!unstarted.some(x => x.house == game[2] && x.round == game[1])) unstarted.push({house:game[2], round:game[1]});
    }

    for(const item of unstarted) await this.#updateUnstarted("Division 1", item.round, item.house, unstartedCompetitions);
  }

  async getMatchData(uuid){
    let date = new Date(Date.now());
    date.setHours(date.getHours() - (11*24));
    date = `${date.getFullYear()}-${date.getMonth() +1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:00`;

    let newMatches =[];
    if(uuid){
      let found = await dataService.getMatches({"uuid":uuid},{"uuid":1});
      if(found.length === 0) newMatches.push(uuid);
    } else {
      
      let matches =[];
      const data = await cyanideService.matches({platform:"pc","id_only":1,limit:100, order:"finished", start:date, league:this.leagueId});
      if (data.matches && data.matches.length > 0) matches = matches.concat(data.matches.map(x => x.gameId));
      
  
      if (matches.length === 0) return;
  
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

  async getCoaches(){
    const clans = await dataService.getClans({active:true});
    const coaches = [];
    clans.map(clan => clan.members.map(member => {
      member.clan = clan.name;
      coaches.push(member);
    }));

    return coaches;
  }

  async getCoachLastSeasonTeam(coach){
    for (let s = this.currentSeason - 1; s >= 1; s--) {
      const teamRegex = new RegExp(`^(?!.*proxy).*(S${s})$`, 'i');
      let teams = await dataService.getTeams({'team.name':teamRegex, 'coach.name':new RegExp(`^${coach.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,'i')});
      if (teams.length > 0) {
        return teams.sort((a,b) => b.team.datelastmatch  > a.team.datelastmatch ? 1 : -1 )[0];
      }
    }
    return undefined;
  }
  async getReturningTeamPlayers(teamId){
    return await dataService.getPlayers({'teamId':Number(teamId),active:true});
  }

async calculateStandings(season){
  season ??= this.season;
  let schedules = await dataService.getSchedules({league:"clan",season:season});

  const newScore = async function(clan,division, _season){
    let c = await dataService.getClan({name:clan, season:_season});
    return {
      league:"clan",
      division:division,
      season:_season,
      logo:c.logo,
      clan:clan,
      clanWins:0,
      clanLosses:0,
      clanDraws:0,
      clanPoints:0,
      matchWins:0,
      matchLosses:0,
      matchDraws:0,
      tdFor:0,
      tdAgainst:0,
      tdDiff:0
    };
  };

  let scores = [];
    for(let schedule of schedules){
      let home = scores.find(x => x.clan.localeCompare(schedule.home.clan, undefined,{sensitivity:"base"}) === 0);
      if (!home) {
        home = await newScore(schedule.home.clan,schedule.competition, season);
        scores.push(home);
      } 
  
      let away = scores.find(x => x.clan.localeCompare( schedule.away.clan, undefined,{sensitivity:"base"}) ===0);
      if (!away) {
        away = await newScore(schedule.away.clan,schedule.competition, season);
        scores.push(away);
      } 
      
      const matchesPlayed = schedule.matches.filter(x => x.opponents && x.opponents[0].team.score !== null);

      if (matchesPlayed.length === 0) continue;

      if (schedule.home.hasOwnProperty("score")){
        if(schedule.home.score > schedule.away.score){
          home.clanWins++;
          away.clanLosses++;
          home.clanPoints += 3;
        } 
        if(schedule.away.score > schedule.home.score){
          away.clanWins++;
          home.clanLosses++;
          away.clanPoints += 3;
        }

      } else {
        if(schedule.home.win > schedule.away.win){
          home.clanWins++;
          away.clanLosses++;
          home.clanPoints += 3;
        } 
        if(schedule.away.win > schedule.home.win){
          away.clanWins++;
          home.clanLosses++;
          away.clanPoints += 3;
        }
        if(schedule.away.win === schedule.home.win){
          home.clanDraws++;
          away.clanDraws++;
          home.clanPoints++;
          away.clanPoints++;
        }
      }

  
      schedule.matches.map(match =>this._parseClanMatch(match,home,away, schedule.home.clan));
    }

    const _sortStandings = function(a,b){
      if(a.division > b.division) return 1;
      if(a.division < b.division) return -1;
  
      if(a.clanPoints > b.clanPoints) return -1;
      if(a.clanPoints < b.clanPoints) return 1;
      
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
        if (schedule.home.clan === a && schedule.home.win > schedule.away.win) return -1;
        if (schedule.away.clan === a && schedule.away.win > schedule.home.win) return -1;
        return 1;
      }
      return 0;
    };


    scores = scores.sort(_sortStandings);
    if (scores.length > 0){
      await dataService.removeStandings({league:"clan",season:season});
      dataService.insertStandings(scores);
    }
  }

  _parseClanMatch(match, home, away, homeClan){
    const isClanTeam = new RegExp(/\[(.*?)]/);
    const isHomeTeam = new RegExp(`^${homeClan}$`,"i");

    

    //Check if the match is part of clan.
    if (!match.opponents) return;
    if (!isClanTeam.test(match.opponents[0].team.name) && !isClanTeam.test(match.opponents[1].team.name)) return;

    //grab the clan name of the match home team.
    let clanNameToMatch = "";
    let index0 = 0, index1 = 1;
    if (isClanTeam.test(match.opponents[0].team.name)) clanNameToMatch = isClanTeam.exec(match.opponents[0].team.name)[1];
    else {
      clanNameToMatch = isClanTeam.exec(match.opponents[1].team.name)[1];
      index0 = 1;
      index1 = 0;
    }

    if(match.opponents[index0].team.score > match.opponents[index1].team.score){
      // match home team won, but, we need to check if the match home team is also this rounds home team.
      isHomeTeam.test(clanNameToMatch) ? this._updateStanding(home,away) : this._updateStanding(away,home);
    } else if(match.opponents[index0].team.score < match.opponents[index1].team.score){
      isHomeTeam.test(clanNameToMatch) ? this._updateStanding(away,home) : this._updateStanding(home,away);
    } else{
      home.matchDraws++;
      away.matchDraws++;
    }

    isHomeTeam.test(clanNameToMatch) 
      ? this._updateTouchdowns(home,away,match.opponents[index0].team.score,match.opponents[index1].team.score) 
      : this._updateTouchdowns(home,away,match.opponents[index1].team.score,match.opponents[index0].team.score);

  }

  _updateStanding(winner, looser){
    winner.matchWins++;
    looser.matchLosses++;
  }

  _updateTouchdowns(homeClan, awayClan, homeTouchdowns, awayTouchdowns){
    homeClan.tdFor += homeTouchdowns;
    homeClan.tdAgainst += awayTouchdowns;
    homeClan.tdDiff = homeClan.tdFor - homeClan.tdAgainst;

    awayClan.tdFor += awayTouchdowns;
    awayClan.tdAgainst += homeTouchdowns;
    awayClan.tdDiff = awayClan.tdFor - awayClan.tdAgainst;
  }

  async newBloodAdmin(clanName,teamId,newTeamName){
    let newTeam = await cyanideService.team({platform:"pc",name:newTeamName});
    if (!newTeam) return;
    newTeam.active = true;

    let clan = await dataService.getClan({name:clanName, active:true});
    if(!clan) return;

    let team = clan.ledger.teams.find(x => x.team.id === teamId);

    clan.teams.splice(clan.teams.findIndex(x=> x.toLowerCase() === team.team.name.toLowerCase()),1);
    clan.teams.push(newTeam.team.name);

    dataService.updateClan({name:clanName, active:true},{$push:{"ledger.teams":newTeam},$set:{teams:clan.teams}});
    
    dataService.updateClan({name:clanName, active:true, "ledger.teams.team.id":teamId},{$set:{"ledger.teams.$.active":false}});

    teamService.updateTeams(newTeam.team.id);
  }

  async newBloodClanLeader(clanName,teamPosition, newTeamName){
    const clan = await dataService.getClan({name:clanName, active:true});
    const teamId = clan.ledger.teams[teamPosition-1].team.id;

    await this.newBlood(clanName, teamId, newTeamName);
  }

  async newCoach(clanName,teamId,newTeamName){
    let newTeam = await cyanideService.team({platform:"pc",name:newTeamName, order:"creationdate"});
    if (!newTeam) return;
    newTeam.active = true;

    let clan = await dataService.getClan({name:clanName, active:true});
    if(!clan) return;

    let team = clan.ledger.teams.find(x => x.team.id === teamId);

    clan.teams.splice(clan.teams.findIndex(x=> x.toLowerCase() === team.team.name.toLowerCase()),1);
    clan.teams.push(newTeam.team.name);


    let member = {coach: newTeam.coach.name, coachId: newTeam.team.idcoach, reddit:""};
    let name = new RegExp(`^${newTeam.coach.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,"i");
    let account = await dataService.getAccount({coach:name});
    if(account) {
      member.reddit = account.reddit;
      member.discord =account.discord;
    } else{
      member.reddit = "not found";
    }
    
    clan.members.splice(clan.members.findIndex(x=> x.coachId === member.coachId),1);
    clan.members.push(member);

    dataService.updateClan({name:clanName, active:true},{$push:{"ledger.teams":newTeam},$set:{teams:clan.teams, members:clan.members}});
    
    dataService.updateClan({name:clanName, active:true, "ledger.teams.team.id":teamId},{$set:{"ledger.teams.$.active":false}});

    teamService.updateTeams(newTeam.team.id);
  }

  assassinate(teamId, playerId){
     dataService.updatePlayer({teamId: teamId, id:playerId},{$set:{assassinated:true}});
  }

  async getCompetitionInformation(division, round, house, unstartedCompetitions){

    let competitions = await this.#getCompetitionInformation(division, house,round, unstartedCompetitions);

    for(let competition of competitions){
      try{
        let response = await fetch(`${this.apiUrl}/api/competition/participants/${competition.id}/2/0`);
        if (!response.ok) continue;
        
        const competitionInformation = await response.json();
        competition.participants = competitionInformation.responseGetCompetitionParticipants.participants.competitionParticipant;
  
        if(!competition.participants) competition.participants = [];
        if(!Array.isArray(competition.participants)) competition.participants = [competition.participants];
  
        response = await fetch(`${this.apiUrl}/api/competition/${competition.id}/tickets/1/0/2/0`);
        
        if (!response.ok) {
          competition.tickets = [];
          continue;
        };

        const information = await response.json();
        const ticketInfos = information.responseGetCompetitionTickets.teamTickets.teamTicket;
        if(ticketInfos)
          if(Array.isArray(ticketInfos))
            competition.tickets = ticketInfos;
          else
            competition.tickets = [ticketInfos];
        else
          competition.tickets = [];
      } catch(err){
        console.trace(err);
      }
    }

    return competitions;
  }

  async updateUnstarted(division, round, house){
    
    if (round && house) await this.#updateUnstarted(division,round,house);
    else for(let x = 1; x < 14; x++) await this.#updateUnstarted(division,1,house);
  }

  async #updateUnstarted(division, round, house, unstartedCompetitions){

    let competitionsInformation = await this.getCompetitionInformation(division, round, house, unstartedCompetitions);
    competitionsInformation = competitionsInformation.filter(x => x.status === "1");

    const mapCompetitionInformation = function(competition, accepted){
      return {
        accepted,
        coachId: competition.gamer.id,
        coachName: competition.gamer.name,
        logo: competition.team.logo.itemId,
        teamId: competition.team.id,
        teamName: competition.team.name
      };  
    };

    const unstarted = competitionsInformation.map(x => {
      return {
        competitionId : x.id,
        competitionName: x.name,
        coaches: x.participants.map(p => mapCompetitionInformation(p,true)).concat(x.tickets.map(t => mapCompetitionInformation(t,false)))
      };
    });


    for (const comp of unstarted)
    for (const coach of comp.coaches){
      const t = await dataService.getTeam({"team.id":coach.teamId},{projection:{roster:0,stats:0}});
      if (!t) {
        continue;
      }
      coach.logo = t.team.logo;
    }

    await dataService.updateSchedule({house,round,competition: division, season: this.season}, {$set:{unstarted: unstarted}});
  }

  async #getCompetitionInformation(division, house, round, unstartedCompetitions){
    let name = `R${round} H${house} G`; //division not used yet
    try{

      if (unstartedCompetitions && !Array.isArray(unstartedCompetitions)) unstartedCompetitions = [unstartedCompetitions];
      if (unstartedCompetitions) return unstartedCompetitions.filter(c => {return c.name.indexOf(name) > -1;});

      const response = await fetch(`${this.apiUrl}/api/league/${this.leagueId}/competitions`)
      if (!response.ok) return [];

      let data = await response.json();

      data = data.responseGetCompetitions.competitions.competition;
      if(!Array.isArray(data)) data =[data];

      return data.filter(c => {
        return c.name.indexOf(name) > -1;
      });
    } catch(err){
      console.trace(err);
    }
    return [];
  }

  async abandon(contestId){
    dataService.updateSchedule({"matches.contest_id":contestId},{"matches.$.opponents.0.team.score":0,"matches.$.opponents.1.team.score":0,"matches.$.counted":true,"matches.$.status":"played"});
  }

  async startCompetitions(username, division, round, house){
    //check schedule.matches
    const schedule = await dataService.getSchedule({league:"clan",season:this.season, competition:division, round, house});

    if (schedule.matches.length === 5) return;

    const home = await dataService.getClan({name:schedule.home.clan, active:true});
    const away = await dataService.getClan({name:schedule.away.clan, active:true});

    const members = away.members.concat(home.members);

    const isMember = members.find(x => x.reddit.localeCompare(username, undefined,{sensitivity:"base"}) === 0);
    

    if (!isMember) throw new Error("You must be part of either clan.");


    for(const s of schedule.unstarted){

      let response = await fetch(`${this.apiUrl}/api/competition/participants/${s.id}/2/0`);
      if (!response.ok) continue;
      
      const competitionInformation = await response.json();
      competition.participants = competitionInformation.responseGetCompetitionParticipants.participants.competitionParticipant;
    }

    if (!Array.isArray(leagueInfo.ResponseGetLeagueData.LeagueData.Competitions.CompetitionSummaryData)){
      leagueInfo.ResponseGetLeagueData.LeagueData.Competitions.CompetitionSummaryData = [leagueInfo.ResponseGetLeagueData.LeagueData.Competitions.CompetitionSummaryData];
    }
    
    for(let competition of leagueInfo.ResponseGetLeagueData.LeagueData.Competitions.CompetitionSummaryData){
      if (competition.Row.CompetitionStatus !== "0") continue;
      const id = competition.Row.Id.Value.replace(/\D/g,"");
      
      const ticketInfo = await apiService.getCompetitionTicketInfo(id).catch(err => console.trace(err));
      if (!ticketInfo) throw new Error("This function is temporaribly unavailable.");
      
      if (ticketInfo.ResponseGetUnusedAffectedTickets.TicketsInfos === ""){
        await apiService.startCompetition(id).catch(err => console.trace(err));
      }
    }
  }

  getLeagueId(competition, house){
    const name = `ReBBL Clan - Div ${competition.split(" ")[1]} H#${house < 4 ? "1-3" : house < 7 ? "4-5" : "7-9"}`;
    return config.getActiveClanSeason().leagues.find(l => l.name === name).id;
  }

}
if (!Promise.each) Promise.each = async (arr, fn) => {for(const item of arr) await fn(item);};

module.exports = new Clan();