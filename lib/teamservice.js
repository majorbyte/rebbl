"use strict";

const Datastore = require('./async-nedb.js')
  , leagueHandler = require('./LeagueService.js')
  , fs = require('fs')
  , cyanideService = require('./CyanideService.js')
  , cache = require('memory-cache');


class TeamService{
  constructor() {
    this.teams = new Datastore.datastore('datastore/league-teams.db');
    this.tempDb = {};

    this.teams.loadDatabase();
  }

  async retrieveTeam(teamName){
    let team = await cyanideService.team({name:teamName});

    if (team && team.team){
      await this.teams.update({"team.id": team.team.id},team,{upsert:true});
      return true;
    }
    else {
      console.log(teamName);
      return false;
    }
  }

  async getTeam(teamName){
    let team = await this.teams.findOne({"team.name":teamName.trim()});

    if (!team){
      const regex = new RegExp(teamName.trim().replace('?','\\?'), 'i');
      team = await this.teams.findOne({"team.name":{"$regex": regex}})
    }

    return team;
  }

  async getTeamStats(_id, teamId=Number(_id)){
    //866385
    let schedules = await leagueHandler.getContests({"opponents.team.id" : teamId, "match_uuid": {$ne : null}});
    let team = schedules[0].opponents.find(function(a){return a.team.id === teamId}).team;

    let roster = [];

    let dir = `datastore/${schedules[0].league.replace(/ /g,'')}`;

    let file = `${dir}/${schedules[0].competition.replace(/ /g,'') }.db`;

    if (!this.tempDb[file]){
      this.tempDb[file] = await new Datastore.datastore(file);
      await this.tempDb[file].loadDatabase();
    }
    let db = this.tempDb[file];

    schedules = await schedules.sort(function(a,b){
      return a.match_uuid > b.match_uuid ? 1: -1;
    });

    await Promise.all(schedules.map(async function(contest){

      if (!contest.match_uuid) return;


      let match = await db.findOne({uuid: contest.match_uuid});

      let team = match.match.teams.find(function(a){ return a.idteamlisting === teamId });


      await Promise.all(team.roster.map(async function(player){
        if (player.id === null) return;
        let exists = roster.find(function(p){return p.id ===player.id});

        if (exists){
          exists.matchplayed += player.matchplayed;
          exists.mvp += player.mvp;
          exists.stats.inflictedcasualties += player.stats.inflictedcasualties;
          exists.stats.inflictedstuns += player.stats.inflictedstuns;
          exists.stats.inflictedpasses += player.stats.inflictedpasses;
          exists.stats.inflictedmeterspassing += player.stats.inflictedmeterspassing;
          exists.stats.inflictedtackles += player.stats.inflictedtackles;
          exists.stats.inflictedko += player.stats.inflictedko;
          exists.stats.inflicteddead += player.stats.inflicteddead;
          exists.stats.inflictedinterceptions += player.stats.inflictedinterceptions;
          exists.stats.inflictedpushouts += player.stats.inflictedpushouts;
          exists.stats.inflictedcatches += player.stats.inflictedcatches;
          exists.stats.inflictedinjuries += player.stats.inflictedinjuries;
          exists.stats.inflictedmetersrunning += player.stats.inflictedmetersrunning;
          exists.stats.inflictedtouchdowns += player.stats.inflictedtouchdowns;
          exists.stats.sustainedinterceptions += player.stats.sustainedinterceptions;
          exists.stats.sustainedtackles += player.stats.sustainedtackles;
          exists.stats.sustainedinjuries += player.stats.sustainedinjuries;
          exists.stats.sustaineddead += player.stats.sustaineddead;
          exists.stats.sustainedko += player.stats.sustainedko;
          exists.stats.sustainedcasualties += player.stats.sustainedcasualties;
          exists.stats.sustainedstuns += player.stats.sustainedstuns;

        } else {
          roster.push(player);
        }
      }));
    }));

    let lastMatch = await db.findOne({uuid: schedules[schedules.length-1].match_uuid});

    let skillFix = lastMatch.match.teams.find(function(a){ return a.idteamlisting === teamId });

    await Promise.all(skillFix.roster.map(async function(player){
      if (player.id === null) return;
      let exists = roster.find(function(p){return p.id ===player.id});

      exists.skills = player.skills;

      exists.casualties_state = player.casualties_state;
      exists.casualties_state_id = player.casualties_state_id;
      exists.casualties_sustained = player.casualties_sustained;
      exists.casualties_sustained_id = player.casualties_sustained_id;
    }));

    roster = await roster.sort(function(a,b){return a.id > b.id ? 1 : -1});

    return {team: team, roster:roster};
  }

  async _parseTeam(teamId){

    let team = await cyanideService.team({team:teamId});
    delete team.meta;
    delete team.urls;

    if (team && team.team)
        await this.teams.update({"team.id": team.team.id},team,{upsert:true});
    else {
      console.dir(team);
      console.log(teamId);}
  }

  async updateTeams(){
    let leagues = [{name : "REBBL - GMAN", link: "GMan", divisions: ['Season 8 - Division 1',
      'Season 8 - Division 2',
      'Season 8 - Division 3',
      'Season 8 - Division 4',
      'Season 8 - Division 5',
      'Season 8 - Division 6A',
      'Season 8 - Division 6B',
      'Season 8 - Division 6C',
      'Season 8 - Division 6D',
      'Season 8 - Division 6E',
      'Season 8 - 6C Swiss']},
      {name: "REBBL - REL", link: "REL", divisions: ['Season 8 - Division 1',
        'Season 8 - Division 2',
        'Season 8 - Division 3',
        'Season 8 - Division 4',
        'Season 8 - Division 5',
        'Season 8 - Division 6',
        'Season 8 - Division 7',
        'Season 8 - Division 8',
        'Season 8 - Division 9A',
        'Season 8 - Division 9B',
        'Season 8 - Division 9C',
        'Season 8 - Division 9D',
        'Season 8 - Division 9E',
        'Season 8 Division 8 Swiss']},
      {name: "REBBL - Big O", link: "Big O", divisions:['Season 8 Div 1',
        'Season 8 Div 2',
        'Season 8 Div 3',
        'Season 8 Div 4A',
        'Season 8 Div 4B',
        'Season 8 Div 4A Swiss',
        'Season 8 Div 4B Swiss']}];


    for(let i = 0; i < leagues.length; i++){
      let league = leagues[i];
      for(let x=0;x<league.divisions.length;x++){
        let division = league.divisions[x];
        let result = await cyanideService.teams({league:league.name,limit:25, competition:division});

        await Promise.all(result.teams.map(async function(team){
          await this._parseTeam(team.id);
        },this));

      }
    }

  }
}

module.exports = new TeamService();