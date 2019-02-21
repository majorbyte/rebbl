"use strict";

const 
  bloodBowlService = require("./bloodbowlService.js")
  //, leagueService = require("./LeagueService.js")
  , cyanideService = require("./CyanideService.js")
  , dataService = require("./DataService.js").rebbl
  , async = require("async")
  , cache = require("memory-cache");


class TeamService{
  constructor() {
    bloodBowlService.getAllSkills().then(function(skills){
      this.allSkills = skills;
    }.bind(this));
  }

  async retrieveTeam(teamName){
    let team = await cyanideService.team({name:teamName});




    if (team && team.team){
      let existing = await dataService.getTeam({"team.id": team.team.id});
      if (existing) return existing;
      
      team.team.roster = team.roster;
            
      dataService.updateTeam({"team.id": team.team.id},team,{upsert:true});
      return team;
    }
    else {
      console.log(teamName);
      return false;
    }
  }

  async getTeams(_coach, id=Number(_coach)){
    return await dataService.getTeams({"team.idcoach":id});
  }
  async getTeam(teamName){
    let team = await dataService.getTeam({"team.name":teamName.trim()});

    if (!team){
      const regex = new RegExp(teamName.trim().replace("?","\\?"), "i");
      team = await dataService.getTeam({"team.name":{"$regex": regex}})
    }

    if (!team){
      team = await cyanideService.team({name:teamName});
      if (team && team.team){
        dataService.updateTeam({"team.id": team.team.id},team,{upsert:true});
        return team;
      }
      else {
        console.log(`team ${teamName} not found.`)
      }
    }

    return team;
  }

  async getTeamById(id){
    return await dataService.getTeam({"team.id":Number(id)});
  }

  async getTeamStats(_id){

    let teamId = Number(_id);
    let team;
    if (isNaN(teamId)){
      const regex = new RegExp(_id.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      team = await dataService.getTeam({"team.name":{ $regex: regex }});
      teamId = team.team.id;
    } else {
      team = await dataService.getTeam({"team.id":teamId});
    }


    let players = await dataService.getPlayers({teamId: teamId});
    
    players = await players.sort(function(a,b){
      if (a.number > b.number) return 1;
      if (a.number < b.number) return -1;
      return a.id > b.id ? 1 : -1}
    );

    return {team: team, roster:players};
  }

  async _parseTeam(teamId){

    let team = await cyanideService.team({team:teamId});
    delete team.meta;
    delete team.urls;

    if (team && team.team)
        dataService.updateTeam({"team.id": team.team.id},team,{upsert:true});
    else {
      console.dir(team);
      console.log(teamId);
    }
  }

  async initTeam(teamId, cb){
    let team = await cyanideService.team({team:teamId});
    delete team.meta;
    delete team.urls;

    if (team && team.team) {
        dataService.updateTeam({"team.id": team.team.id},team,{upsert:true});
    } else {
      console.dir(team);
      console.log(teamId);
    }
    if (cb) cb();
  }

  async initTemas() {
      const teams = await leagueService.searchLeagues({},{"opponents.team.id":1});
      const ids = [];
      teams.map(function(a){ 
          ids.push(a.opponents.team.id[0]);
      });
      
      let unique = [...new Set(ids)];   

      let queue = async.queue(this.initTeam, 20  /* 20 at a time*/);
  
      queue.drain = function() {
        console.log('All Tasks finished successfully.');
      };
  
      queue.push(unique);

  }

  async updateTeams(id, justTeam){

      if (id){
        await this.updateTeam(id);
        cache.del(encodeURI(`/rebbl/team/${id}`));
        return;
      }

      let teams = [];
      if (justTeam){
      let teams = await dataService.getTeams({});
      } else {
        let range = new Date(Date.now() - (21*86400000));
        let dateLastMatch= range.toISOString();//.replace('Z','').replace('T','');
        teams = await dataService.getTeams({"team.datelastmatch":{$gt:dateLastMatch}});
      }

      let q = async.queue(async function(team,callback){

        await this.updateTeam(team.team.id, justTeam);
        cache.del(encodeURI(`/rebbl/team/${team.team.id}`));
        callback();
      }.bind(this),10);

      q.drain = async function() {
        console.log("done");
        //pack  
      }.bind(this);

      q.push(teams);

  }


  async updateTeam(teamId,justTeam){
    const team = await cyanideService.team({team:teamId});
    if(!team) return;

    //admin team
    if(!team.roster) return;

    let currentTeam = await dataService.getTeam({"team.id":team.team.id});
    if (!currentTeam) {
      this.initTeam(teamId);
      return  ;
    }
    let missingPlayers = 0;
    let missingTV = 0;
    if (!justTeam){    
      dataService.updatePlayers({"teamId":teamId},{active:false},{multi:true});


      currentTeam.roster = team.roster;

      await Promise.all(currentTeam.roster.map(async function(currentPlayer){
        
      let player = await dataService.getPlayer({id:currentPlayer.id});
        if(player && currentPlayer.id !== null){
          let skills = currentPlayer.skills.concat();
          if (this.allSkills[currentPlayer.type]){
            skills = this.allSkills[currentPlayer.type].concat(skills);
          }

	  dataService.updatePlayer({_id:player._id},{"teamId":teamId, "active":true, "skills":skills, "value":currentPlayer.value, "xp": currentPlayer.xp, "level":currentPlayer.level, "number":currentPlayer.number});
	  
        } else {
          currentPlayer.active = currentPlayer.id !== null;
          currentPlayer.teamId = team.team.id;
          currentPlayer.skills = this.allSkills[currentPlayer.type];
          dataService.insertPlayer(currentPlayer);
        }

        if (player && player.casualties_sustained && ((player.casualties_sustained.length === 1 && player.casualties_sustained[0] !== "BadlyHurt") 
            || (player.casualties_sustained.length === 2 && player.casualties_sustained[0] !== "BadlyHurt" && player.casualties_sustained[1] !== "BadlyHurt")) ){
          missingPlayers++;
          missingTV += currentPlayer.value;
          
        }

      },this)).then(() => currentTeam.team.actualTV = team.team.value + missingTV);

      currentTeam.team.roster = currentTeam.roster;
      currentTeam.team.rerolls = team.team.rerolls;
      currentTeam.team.value = team.team.value;


      let lonerValue = await bloodBowlService.getLonerCost(currentTeam.team.idraces);
      if (team.team.nbplayers - missingPlayers < 11 ){
        currentTeam.team.nextMatchTV = currentTeam.team.value + ( (11 -(team.team.nbplayers - missingPlayers)) * lonerValue/1000);
      } else {
        currentTeam.team.nextMatchTV = currentTeam.team.value;
      }
    }
    currentTeam.team.popularity = team.team.popularity;
    currentTeam.team.cash = team.team.cash;
    currentTeam.team.cheerleaders = team.team.cheerleaders;
    currentTeam.team.apothecary = team.team.apothecary;
    currentTeam.team.balms = team.team.balms;
    currentTeam.team.assistantcoaches = team.team.assistantcoaches;
    currentTeam.team.nbplayers = team.team.nbplayers;
    currentTeam.team.stadiumlevel = team.team.stadiumlevel;
    currentTeam.team.stadiumtype = team.team.stadiumtype;
    currentTeam.team.nbplayers = team.team.nbplayers;
    currentTeam.team.cards = team.team.cards;
    currentTeam.team.leitmotiv = team.team.leitmotiv;
    currentTeam.team.datelastmatch= team.team.datelastmatch;

    dataService.updateTeam({_id:currentTeam._id},currentTeam);

  }

  _updateTeamStats(team, currentTeam, opponent){
    team.stats.inflictedcasualties += currentTeam.inflictedcasualties;
    team.stats.inflictedpasses += currentTeam.inflictedpasses;
    team.stats.inflictedmeterspassing += currentTeam.inflictedmeterspassing;
    team.stats.inflictedtackles += currentTeam.inflictedtackles;
    team.stats.inflictedko += currentTeam.inflictedko;
    team.stats.inflicteddead += currentTeam.inflicteddead;
    team.stats.inflictedinterceptions += currentTeam.inflictedinterceptions;
    team.stats.inflictedcatches += currentTeam.inflictedcatches;
    team.stats.inflictedinjuries += currentTeam.inflictedinjuries;
    team.stats.inflictedmetersrunning += currentTeam.inflictedmetersrunning;
    team.stats.inflictedstuns = team.stats.inflictedinjuries - team.stats.inflictedcasualties - team.stats.inflictedko;
    team.stats.inflictedtouchdowns += currentTeam.inflictedtouchdowns;
    team.stats.sustainedexpulsions += currentTeam.sustainedexpulsions;
    team.stats.sustainedtouchdowns += opponent.score;

    team.stats.sustainedinjuries += currentTeam.sustainedinjuries;
    team.stats.sustaineddead += currentTeam.sustaineddead;
    team.stats.sustainedko += currentTeam.sustainedko;
    team.stats.sustainedcasualties += currentTeam.sustainedcasualties;
    team.stats.sustainedpasses += opponent.inflictedpasses;
    team.stats.sustainedmeterspassing += opponent.inflictedmeterspassing;
    team.stats.sustainedcatches += opponent.inflictedcatches;
    team.stats.sustainedmetersrunning += opponent.inflictedmetersrunning;

    team.stats.sustainedstuns = team.stats.sustainedinjuries - team.stats.sustainedko - team.stats.sustainedcasualties;
    team.stats.sustainedinterceptions += opponent.inflictedinterceptions;
    team.stats.sustainedtackles += opponent.inflictedtackles;
    team.stats.inflictedexpulsions += opponent.sustainedexpulsions;
    team.stats.cashearned += currentTeam.cashearned;
    team.stats.spirallingexpenses += currentTeam.spirallingexpenses;
    team.stats.nbsupporters += currentTeam.nbsupporters;

    return team.stats;
  }

  async updateTeamsAfterMatch(match){
    let matchTeam1 = match.match.teams[0];
    let matchTeam2 = match.match.teams[1];

    cache.del(encodeURI(`/rebbl/team/${matchTeam1.idteamlisting}`));
    cache.del(encodeURI(`/rebbl/team/${matchTeam2.idteamlisting}`));
    cache.del(encodeURI(`/rebbl/coach/${match.match.coaches[0].idcoach}`));
    cache.del(encodeURI(`/rebbl/coach/${match.match.coaches[1].idcoach}`));
    cache.del(encodeURI(`/rebbl/coach/${match.match.coaches[0].idcoach}/matches`));
    cache.del(encodeURI(`/rebbl/coach/${match.match.coaches[1].idcoach}/matches`));

    let team1 = await this.getTeam(matchTeam1.teamname);
    let team2 = await this.getTeam(matchTeam2.teamname);


    if (!team1.stats) team1.stats={};
    if (!team2.stats) team2.stats={};
    await Promise.all(matchTeam1.roster.map(async function(player){
      team1.stats.inflictedpushouts += player.stats.inflictedpushouts;
      team2.stats.sustainedpushouts += player.stats.inflictedpushouts;
    }));
    await Promise.all(matchTeam2.roster.map(async function(player){
      team2.stats.inflictedpushouts += player.stats.inflictedpushouts;
      team1.stats.sustainedpushouts += player.stats.inflictedpushouts;
    }));

    team1.stats = this._updateTeamStats(team1, matchTeam1, matchTeam2);
    team2.stats = this._updateTeamStats(team2, matchTeam2, matchTeam1);

    dataService.updateTeam({_id:team1._id}, team1);
    dataService.updateTeam({_id:team2._id}, team2);
    
    await this.updateTeamPlayers(matchTeam1);
    await this.updateTeamPlayers(matchTeam2);

    await this.updateTeam(matchTeam1.idteamlisting);
    await this.updateTeam(matchTeam2.idteamlisting);

    cache.del(encodeURI(`/rebbl/team/${matchTeam1.idteamlisting}`));
    cache.del(encodeURI(`/rebbl/team/${matchTeam2.idteamlisting}`));
  }

  async updateTeamPlayers(team){
    if (!team.roster) return;
    await Promise.all(team.roster.map(async function(currentPlayer){
      let levels = [0,6,16,31,51,76,176,1000]
      let player;
      if (currentPlayer.id ===null){
        player = await dataService.getPlayer({teamId:team.idteamlisting , name: currentPlayer.name});
      } else{
        player = await dataService.getPlayer({id:currentPlayer.id});
      }

      if (!player) {
        player = currentPlayer;
        player.active = currentPlayer.id ? false: true;
        player.teamId = team.idteamlisting;
        player.skills = this.allSkills[currentPlayer.type];
        player.casualties_sustained = currentPlayer.casualties_sustained || [];

        player.stats.inflictedstuns = player.stats.inflictedinjuries - player.stats.inflictedcasualties - player.stats.inflictedko; 
        player.stats.sustainedstuns = player.stats.sustainedinjuries - player.stats.sustainedcasualties - player.stats.sustainedko; 
        if (player.casualties_state.indexOf("Dead")>-1){
          player.active =false;
          while (levels[player.level] < player.xp + player.xp_gain  ){
            player.level = player.level+1;
          }          
        }

        dataService.insertPlayer(player);
      } else {
        if (!player.stats){
          player.stats = currentPlayer.stats;
        } else {
          Object.keys( player.stats ).forEach( key => {
            player.stats[key] += currentPlayer.stats[key];
            
          });
        }
        player.matchplayed = (player.matchplayed || 0)  + ( currentPlayer.matchplayed || 0);
        player.xp_gain = (player.xp_gain || 0) + (currentPlayer.xp_gain || 0);
        player.mvp = (player.mvp || 0) + (currentPlayer.mvp || 0);
        if(currentPlayer.casualties_sustained){
          player.casualties_sustained_total = (player.casualties_sustained_total || []).concat(currentPlayer.casualties_sustained);
        }
        
        player.skills = currentPlayer.skills;
        
        player.value = currentPlayer.value; 
        player.xp = currentPlayer.xp;
        player.casualties_state = currentPlayer.casualties_state;
        player.casualties_sustained =  currentPlayer.casualties_sustained;
        player.attributes = currentPlayer.attributes;
        
        if(player.attributes.ag === 0) player.attributes.ag = 1;
        if(player.attributes.av === 0) player.attributes.av = 1;
        if(player.attributes.ma === 0) player.attributes.ma = 1;       
        if(player.attributes.st === 0) player.attributes.st = 1;

        player.stats.inflictedstuns = player.stats.inflictedinjuries - player.stats.inflictedcasualties - player.stats.inflictedko; 
        player.stats.sustainedstuns = player.stats.sustainedinjuries - player.stats.sustainedcasualties - player.stats.sustainedko; 

        if (player.casualties_state.indexOf("Dead")>-1){
          player.active =false;
          while (levels[player.level] < player.xp + player.xp_gain  ){
            player.level = player.level+1;
          }
        }
          
        dataService.updatePlayer({_id:player._id},player);
      }
    },this));

    //clear sustained casualties for players that weren"t in this match
    let activePlayers = await dataService.getPlayers({teamId:team.idteamlisting, active:true});

    let justMng = ["BrokenJaw","BrokenRibs","FracturedArm","FracturedLeg","GougedEyes","GroinStrain","PinchedNerve","SmashedHand"];
    await Promise.all(activePlayers.map(async function(player){

      let played = team.roster.find(function(p){ return p.id === player.id },this);

      if(!played){
        player.casualties_sustained =  [];
        if(player.casualties_state){
          for(let x= player.casualties_state.length-1; x>-1;x--){
            if (justMng.indexOf(player.casualties_state[x]) > -1 ){
              let cas = player.casualties_state.splice(x,1);
            }
          }
        }
        dataService.updatePlayer({_id:player._id},player);
      }

    },this));
  }


  async quickFixPlayers(){
    let levels = [0,6,16,31,51,76,176,1000]

    let oldPlayers = await dataService.getPlayers({"active":false});

    oldPlayers.map(player => {
      while (levels[player.level] < player.xp  ){
        player.level = player.level+1;
      }
      dataService.updatePlayer({_id:player._id},player);
    });
  }


/*
  async fixPastPlayers(){
    let teams = await dataService.getTeams({});
    let levels = [0,6,16,31,51,76,176,1000]

    this.playerArray = [];
    await Promise.all(teams.map(async function(team){
      let teamId = team.team.id;
      if(team.team.name.toLowerCase().indexOf("[admin]")> -1){
        console.dir(team);
        return;
      }
      team.roster.map(async function(player){
        player.active = true;
        player.teamId = teamId;
        player.skills = this.allSkills[player.type];
        this.playerArray.push(player);
      },this);

      let matches = await leagueService.searchLeagues({"opponents.team.id":team.team.id, "match_uuid": {"$ne": null}},{"match_uuid":1});
      let ids = [];
      await matches.map(async function(a){ 
        ids.push(a.match_uuid);
      });
      ids = ids.sort((a,b) => parseInt(a,16) > parseInt(b,16) ? 1: -1);
      let q = async.queue(async function(matchId, callback){
        let match = await leagueService.getMatchDetails(matchId);
        if (!match) {
          console.log(matchId);
          return;
        };
        let team = match.match.teams.filter(function(team){return team.idteamlisting === teamId})[0];
        if(!team){
          return;
        } 
        await Promise.all(team.roster.map(function(currentPlayer){
          let playerIndex;
          let player;
          if (currentPlayer.id ===null){
            playerIndex = this.playerArray.findIndex(function(p){return p.teamId === teamId && p.name === currentPlayer.name});
            player = this.playerArray[playerIndex];
          } else{
            playerIndex = this.playerArray.findIndex(function(p){return p.id == currentPlayer.id});
            player = this.playerArray[playerIndex];
          }
          if (player) {
            if (!player.stats){
              player.stats = currentPlayer.stats;
              player.xp_gain = currentPlayer.xp_gain;
              player.matchplayed = 1;
              player.mvp = currentPlayer.mvp;
              player.casualties_sustained_total =  currentPlayer.casualties_sustained || [];
            } else {
              Object.keys( player.stats ).forEach( key => {
                player.stats[key] += currentPlayer.stats[key];
              });
              player.matchplayed = (player.matchplayed || 0)  + ( currentPlayer.matchplayed || 0);
              player.xp_gain = (player.xp_gain || 0) + (currentPlayer.xp_gain || 0);
              player.mvp = (player.mvp || 0) + (currentPlayer.mvp || 0);
              if(currentPlayer.casualties_sustained)
                player.casualties_sustained_total = (player.casualties_sustained_total || []).concat(currentPlayer.casualties_sustained);
            }
            player.skills = currentPlayer.skills;
            player.value = currentPlayer.value; 
            player.xp = currentPlayer.xp;
            player.casualties_state = currentPlayer.casualties_state;
            player.casualties_sustained =  currentPlayer.casualties_sustained;
            player.attributes = currentPlayer.attributes;
            if(player.attributes.ag === 0) player.attributes.ag = 1;
            if(player.attributes.av === 0) player.attributes.av = 1;
            if(player.attributes.ma === 0) player.attributes.ma = 1;       
            if(player.attributes.st === 0) player.attributes.st = 1;
    
            
            player.stats.inflictedstuns = player.stats.inflictedinjuries - player.stats.inflictedcasualties - player.stats.inflictedko; 
            player.stats.sustainedstuns = player.stats.sustainedinjuries - player.stats.sustainedcasualties - player.stats.sustainedko; 
            
            this.playerArray[playerIndex] =player;
          } else {
            currentPlayer.active = false;
            currentPlayer.teamId = teamId;
            //check level
            while (levels[currentPlayer.level] < currentPlayer.xp + currentPlayer.xp_gain  ){
              currentPlayer.level = currentPlayer.level+1;
            }

            this.playerArray.push(currentPlayer);
          }
        },this));
        callback();
      }.bind(this),1);
      q.drain = async function() {
        console.log(`${team.team.name} : all items have been processed`);

        //clear sustained casualties for players that weren't in this match
        let activePlayers = await this.playerArray.filter(function(p) { return p.teamId === team.team.id && p.active});

        let justMng = ["BrokenJaw","BrokenRibs","FracturedArm","FracturedLeg","GougedEye","GroinStrain","PinchedNerve","SmashedHand"];
        await Promise.all(activePlayers.map(async function(player){

          let matchId = ids[ids.length - 1];
          let match = await leagueService.getMatchDetails(matchId);
          
          let teamPlayed = match.match.teams[0].idteamlisting === team.team.id ? match.match.teams[0] : match.match.teams[1];

          let played = teamPlayed.roster.find(function(p){ return p.id === player.id });

          if(!played){
            player.casualties_sustained =  [];
            if(player.casualties_state){
              for(let x= player.casualties_state.length-1; x>-1;x--){
                if (justMng.indexOf(player.casualties_state[x]) > -1 ){
                  player.casualties_state.splice(x,1);
                }
              }
            }
            dataService.updatePlayer({_id:player._id},player);
          }

        },this));

      }.bind(this);
      q.push(ids);

    },this)).then(async function(){
      setTimeout (async function(){await Promise.all(this.playerArray.map(player =>dataService.insertPlayer(player),this),this).then(() => console.log("DONE!")) }.bind(this) ,120000);
    }.bind(this));;
  }

  async fixTeamStats(){
    let teams = await dataService.getTeams({});
    this.matchArray = [];

    await Promise.all(teams.map(async function(team){
      
      if(!team.stats){
        team.stats = {
          inflictedcasualties:0,
          inflictedstuns:0,
          inflictedpasses:0,
          inflictedmeterspassing:0,
          inflictedtackles:0,
          inflictedko:0,
          inflicteddead:0,
          inflictedinterceptions:0,
          inflictedpushouts:0,
          inflictedcatches:0,
          inflictedinjuries:0,
          inflictedmetersrunning:0,
          inflictedtouchdowns:0,
          sustainedtouchdowns:0,
          sustainedinterceptions:0,
          sustainedtackles:0,
          sustainedinjuries:0,
          sustaineddead:0,
          sustainedko:0,
          sustainedpushouts:0,
          sustainedcasualties:0,
          sustainedstuns:0,
          sustainedexpulsions:0,
          inflictedexpulsions:0,
          cashearned:0,
          spirallingexpenses:0,
          nbsupporters:0,
          sustainedcatches:0,
          sustainedmetersrunning:0,
          sustainedmeterspassing:0,
          sustainedpasses:0
        };
      }
      let matches = await leagueService.searchLeagues({"opponents.team.id":team.team.id, "match_uuid": {"$ne": null}},{"match_uuid":1});
      let ids = [];
      await matches.map(async function(a){ 
          ids.push(a.match_uuid);
      });
      ids = ids.sort((a,b) => parseInt(a,16) > parseInt(b,16) ? 1: -1);
      let teamId = team.team.id;
      await Promise.all(ids.map(async function(matchId){
        let match = await leagueService.getMatchDetails(matchId);
        if (!match) return;
        let currentTeam = match.match.teams.filter(function(team){return team.idteamlisting === teamId})[0];
        let opponent = match.match.teams.filter(function(team){return team.idteamlisting !== teamId})[0];


        await Promise.all(currentTeam.roster.map(async function(player){
          team.stats.inflictedpushouts += player.stats.inflictedpushouts;
        }));
        await Promise.all(opponent.roster.map(async function(player){
          team.stats.sustainedpushouts += player.stats.inflictedpushouts;
        }));

        team.stats.inflictedcasualties += currentTeam.inflictedcasualties;
        team.stats.inflictedpasses += currentTeam.inflictedpasses;
        team.stats.inflictedmeterspassing += currentTeam.inflictedmeterspassing;
        team.stats.inflictedtackles += currentTeam.inflictedtackles;
        team.stats.inflictedko += currentTeam.inflictedko;
        team.stats.inflicteddead += currentTeam.inflicteddead;
        team.stats.inflictedinterceptions += currentTeam.inflictedinterceptions;
        team.stats.inflictedcatches += currentTeam.inflictedcatches;
        team.stats.inflictedinjuries += currentTeam.inflictedinjuries;
        team.stats.inflictedmetersrunning += currentTeam.inflictedmetersrunning;
        team.stats.inflictedstuns = team.stats.inflictedinjuries - team.stats.inflictedcasualties - team.stats.inflictedko;
        team.stats.inflictedtouchdowns += currentTeam.inflictedtouchdowns;
        team.stats.sustainedexpulsions += currentTeam.sustainedexpulsions;
        team.stats.sustainedtouchdowns += opponent.score;

        team.stats.sustainedinjuries += currentTeam.sustainedinjuries;
        team.stats.sustaineddead += currentTeam.sustaineddead;
        team.stats.sustainedko += currentTeam.sustainedko;
        team.stats.sustainedcasualties += currentTeam.sustainedcasualties;
        team.stats.sustainedpasses += opponent.inflictedpasses;
        team.stats.sustainedmeterspassing += opponent.inflictedmeterspassing;
        team.stats.sustainedcatches += opponent.inflictedcatches;
        team.stats.sustainedmetersrunning += opponent.inflictedmetersrunning;

        team.stats.sustainedstuns = team.stats.sustainedinjuries - team.stats.sustainedko - team.stats.sustainedcasualties;
        team.stats.sustainedinterceptions += opponent.inflictedinterceptions;
        team.stats.sustainedtackles += opponent.inflictedtackles;
        team.stats.inflictedexpulsions += opponent.sustainedexpulsions;
        team.stats.cashearned += currentTeam.cashearned;
        team.stats.spirallingexpenses += currentTeam.spirallingexpenses;
        team.stats.nbsupporters += currentTeam.nbsupporters;
      },this));
      dataService.updateTeam({_id:team._id},team);
    },this)).then(() => console.log("done"));
  }
*/
}

module.exports = new TeamService();