"use strict";

const bloodBowlService = require("./bloodbowlService.js")
  , cyanideService = require("./CyanideService.js")
  , dataService = require("./DataService.js").cripple
  , loggingService = require("./loggingService.js")
  , cache = require("memory-cache");


class CrippleService{
  constructor(){

    //dataService = new DataService();
    //dataService.init("cripple");

    this.cache = cache;
    this.allSkills = [];

  }

  async init(socket){

    this.socket = socket;
  }


  async getMatch(id){
    try {
  

      let exist = await dataService.getMatch({"uuid": id});

      if (exist) return null;//already exists

      let match = await cyanideService.match({match_id: id});

      if (!match) return null; 

      // we need to manually correct surfs
      if (match.match.teams[0].roster)
        match.match.teams[0].inflictedpushouts = match.match.teams[0].roster.reduce(function(p,c){ return p + c.stats.inflictedpushouts },0);
      if (match.match.teams[1].roster)
        match.match.teams[1].inflictedpushouts = match.match.teams[1].roster.reduce(function(p,c){ return p + c.stats.inflictedpushouts },0);

      if (match){
        dataService.insertMatch(match);

        await this.updateTeamsAfterMatch(match);
        
        cache.del(encodeURI(`/api/v1/cripple/standings`));
      
        return id;
      }

    } catch(e) {
      loggingService.error(e);
    }

    return null;
  }

  async getMatches(){
    try {
      if (!dataService.isConnected){
        console.log("need to wait for connection");
        return;
      }
    
      const league = await cyanideService.league({platform:"pc",league:"REBBL Off Season", competition:"REBBL Cripple Ladder"});

      if (!league) return;

      let now = new Date(Date.now());

      now.setHours(now.getHours()-1,now.getMinutes()-2);

      let lastMatch = new Date(league.league.date_last_match);

      if (lastMatch < now) return;
      now.setHours(now.getHours()-2);


      const ids = await cyanideService.matches({league:"REBBL Off Season", competition:"REBBL Cripple Ladder", start: now.toISOString(),id_only:1,limit:2000})

      if (ids)
        await Promise.all(ids.matches.map(async id => this.getMatch(id.uuid))).then(data => this.calculateStandings("REBBL Cripple Ladder",data));
      
      this.notifyClients();

    }
    catch(ex){
      loggingService.error(ex);
    }
  }


  async calculateStandings(competition, ids){
    const limit =42, gamesBonus= 0.02, win =	100, conDraw = 50, RefPoint =	28, RefPerc =	0.05, CrossPoint =	0.2;
    const expo = Math.log(RefPerc/(1-CrossPoint))/Math.log((1-(RefPoint/limit)));


    let matches = [];
    let teamIds = []
    if(ids){
      let m = await dataService.getMatches({"uuid":{$in: ids}});

      const home = [...new Set(m.map(x => x.teams[0].id ))];
      const away = [...new Set(m.map(x => x.teams[1].id ))];
      teamIds = home.concat(away);

      matches = await dataService.getMatches({"match.competitionname":competition, "teams.id":{$in: teamIds}});


    } else {
      matches = await dataService.getMatches({"match.competitionname":competition});
    }

    const home = [...new Set(matches.map(x => x.teams[0].id ))];
    const away = [...new Set(matches.map(x => x.teams[1].id ))];
    if (teamIds.length === 0) teamIds = [... new Set(home.concat(away).map(x => x))];


    let result = teamIds.map(team => {

      const m = matches.filter(x => x.teams[0].id === team || x.teams[1].id === team);

      const gamesPlayed = m.length;
      const wins =  m.filter(x => (x.teams[0].id === team && x.match.teams[0].score > x.match.teams[1].score) || (x.teams[1].id === team && x.match.teams[1].score > x.match.teams[0].score) ).length;
      const draws = m.filter(x => x.match.teams[0].score  === x.match.teams[1].score ).length;

      const winPercentage=(wins*win+draws*conDraw)/gamesPlayed;

      const limFactor = CrossPoint+(1-CrossPoint)*(1-(Math.pow (1-(0.5*((gamesPlayed+limit)-Math.sqrt(Math.pow(gamesPlayed-limit,2)))/limit), expo)));

      const score = (winPercentage * limFactor) + gamesPlayed*gamesBonus;

      return {teamId: team, score:score, gp:gamesPlayed, wins:wins, draws:draws, limFactor:limFactor, winPercentage:winPercentage, competition:competition};
    });



    result.map(r =>{
      dataService.updateStanding({"competition":r.competition, "teamId":r.teamId},r,{upsert:true});
    });
  }


  async getStandings(){
    let standings = await dataService.getStandings({});


    return await Promise.all(standings.map(async s => {
      let team = await dataService.getTeam({"team.id":s.teamId});
      if (team){ 
        s.team = team.team;
        s.coach = team.coach;
      }
      return s; 
    }));
  }

  async initTeam(teamId, cb){
    let team = await cyanideService.team({team:teamId});

    if (team && team.team) {
        dataService.updateTeam({"team.id": team.team.id},team,{upsert:true});
    } else {
      loggingService.error(team);
    }
    if (cb) cb();
  }


  async updateTeamsAfterMatch(match){
    let matchTeam1 = match.match.teams[0];
    let matchTeam2 = match.match.teams[1];
    try{

      cache.del(encodeURI(`/cripple/team/${matchTeam1.idteamlisting}`));
      cache.del(encodeURI(`/cripple/team/${matchTeam2.idteamlisting}`));
      cache.del(encodeURI(`/cripple/coach/${match.match.coaches[0].idcoach}`));
      cache.del(encodeURI(`/cripple/coach/${match.match.coaches[1].idcoach}`));
      cache.del(encodeURI(`/cripple/coach/${match.match.coaches[0].idcoach}/matches`));
      cache.del(encodeURI(`/cripple/coach/${match.match.coaches[1].idcoach}/matches`));

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

      await dataService.updateTeam({_id:team1._id}, team1);
      await dataService.updateTeam({_id:team2._id}, team2);
      
      await this.updateTeamPlayers(matchTeam1);
      await this.updateTeamPlayers(matchTeam2);

      await this.updateTeam(matchTeam1.idteamlisting);
      await this.updateTeam(matchTeam2.idteamlisting);

      await this.updateCAS(matchTeam1, matchTeam2);
    } catch(ex){
      loggingService.error(ex);
    }


    cache.del(encodeURI(`/cripple/team/${matchTeam1.idteamlisting}`));
    cache.del(encodeURI(`/cripple/team/${matchTeam2.idteamlisting}`));
  }

  async getTeam(teamName){
    let team = await dataService.getTeam({"team.name":teamName.trim()});

    if (!team){
      const regex = new RegExp(teamName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      team = await dataService.getTeam({"team.name":{"$regex": regex}})
    }

    if (!team){
      team = await cyanideService.team({name:teamName});
      if (team && team.team){
        await dataService.updateTeam({"team.id": team.team.id},team,{upsert:true});
        return team;
      }
      else {
        loggingService.information(`team ${teamName} not found.`);
      }
    }

    return team;
  }


  async updateTeamPlayers(team){
    if (!team.roster) return;

    if(this.allSkills.length == 0){
      this.allSkills = await bloodBowlService.getAllSkills();
    }

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

  async updateTeam(teamId){
    const team = await cyanideService.team({team:teamId});
    if(!team) return;

    //admin team
    if(!team.roster) return;


    let currentTeam = await dataService.getTeam({"team.id":team.team.id});
    if (!currentTeam) {
      this.initTeam(teamId);
      return  ;
    }
    
    if(this.allSkills.length == 0){
      this.allSkills = await bloodBowlService.getAllSkills();
    }

    await dataService.updatePlayers({"teamId":teamId},{active:false},{multi:true});

    let missingPlayers = 0;
    let missingTV = 0;
    await Promise.all(team.roster.map(async function(currentPlayer){
      
      let player = await dataService.getPlayer({id:currentPlayer.id});
      if(player && currentPlayer.id !== null){
        let skills = currentPlayer.skills.concat();
        if (this.allSkills[currentPlayer.type]){
          skills = this.allSkills[currentPlayer.type].concat(skills);
        }

        dataService.updatePlayer({_id:player._id},{"active":true, "skills":skills, "value":currentPlayer.value, "xp": currentPlayer.xp, "level":currentPlayer.level, "number":currentPlayer.number});
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

    },this)).then(() =>     currentTeam.team.actualTV = team.team.value + missingTV);


    currentTeam.team.rerolls = team.team.rerolls;
    currentTeam.team.value = team.team.value;


    let lonerValue = await bloodBowlService.getLonerCost(currentTeam.team.idraces);
    if (team.team.nbplayers - missingPlayers < 11 ){
      currentTeam.team.nextMatchTV = currentTeam.team.value + ( (11 -(team.team.nbplayers - missingPlayers)) * lonerValue/1000);
    } else {
      currentTeam.team.nextMatchTV = currentTeam.team.value;
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

  async updateCAS(team1, team2){
    const busts = ["BrokenNeck", "FracturedSkull","SeriousConcussion","SmashedAnkle","SmashedCollarBone","SmashedHip","DamagedBack", "SmashedKnee","Dead",];
    
    const r = (p, c) => {
      for (var cas in c.casualties_sustained)
        if (busts.indexOf(c.casualties_sustained[cas]) > -1 )  p[c.casualties_sustained[cas]]++;

      return p;
    }

    let cas = team1.roster.reduce(r ,{ "BrokenNeck":0, "FracturedSkull":0,"SeriousConcussion":0,"SmashedAnkle":0,"SmashedCollarBone":0,"SmashedHip":0,"DamagedBack":0,"SmashedKnee":0,"Dead":0 } )


    cas = team2.roster.reduce(r,cas);

    dataService.updateCasualties({"name":"cripple"},{$inc:cas} ,{upsert:true} )
  }

  async getCasualties(){
    if  (!dataService.isConnected) return;

    let data = cache.get("crippleData");
    if (data) return data;

    data = await dataService.getCasualties({"name":"cripple"});
    cache.put("crippleData", data);

    return data;
  }

  async notifyClients(){

    cache.del("crippleData");
    
    let cas = await this.getCasualties();

    cache.put("crippleData", cas);

    this.socket.emit('cripple',cas);
  }

}

module.exports = new CrippleService();
