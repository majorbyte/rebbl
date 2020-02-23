"use strict";

const bloodBowlService = require("./bloodbowlService.js")
  , cyanideService = require("./CyanideService.js")
  , dataService = require("./DataService.js").rebbl
  , loggingService = require("./loggingService.js")
  , cache = require("memory-cache")
  , ogreRaceId = 19;

class TourneyService{
  constructor(){
    this.cache = cache;
    this.allSkills = [];
    this.races = [];

    this.BigGuys = ["Human_Ogre",
    "Dwarf_DeathRoller",
    "WoodElf_Treeman",
    "Skaven_RatOgre",
    "Orc_Troll",
    "Lizardman_Kroxigor",
    "Chaos_Minotaur",
    "Goblin_Troll",
    "Undead_Mummy",
    "Halfling_Treeman",
    "Norse_Yhetee",
    "Khemri_TombGuardian",
    "Nurgle_BeastOfNurgle",
    "Ogre_Ogre",
    "ChaosDwarf_Minotaur",
    "Underworld_Troll",
    "Kislev_TameBear",
    "StarPlayer_MorgNThorg",
    "StarPlayer_GrashnakBlackhoof",
    "StarPlayer_Headsplitter",
    "StarPlayer_Ripper",
    "StarPlayer_CountLuthorvonDrakenborg",
    "StarPlayer_LordBorakTheDespoiler",
    "StarPlayer_DeeprootStrongbranch",
    "StarPlayer_RamtutIII",
    "StarPlayer_IcepeltHammerblow",
    "StarPlayer_MightyZug",
    //"StarPlayer_Fezglitch",
    "StarPlayer_BrickFarth",
    "StarPlayer_GrashnakBlackhoof_Fallback",
    "StarPlayer_Headsplitter_Fallback",
    "StarPlayer_Ripper_Fallback",
    "StarPlayer_MorgNThorg_Fallback",
    "StarPlayer_CountLuthorvonDrakenborg_Fallback",
    "StarPlayer_LordBorakTheDespoiler_Fallback",
    "StarPlayer_DeeprootStrongbranch_Fallback",
    "StarPlayer_RamtutIII_Fallback",
    "StarPlayer_IcepeltHammerblow_Fallback",
    "StarPlayer_MightyZug_Fallback",
    //"StarPlayer_Fezglitch_Fallback",
    "StarPlayer_BrickFarth_Fallback",
    "StarPlayer_BerthaBigfist",
    "StarPlayer_BerthaBigfist_Fallback",
    "StarPlayer_HtharkTheUnstoppable_Fallback",
    "StarPlayer_HtharkTheUnstoppable",
    "StarPlayer_FungusTheLoon",
    "StarPlayer_FungusTheLoon_Fallback"];

 
  }


  async _parseNewContest(match){
    try {
      if (match.leaguename === "Huge Jackedman Memorial") match.league = "HJMC";
      let contest = await dataService.getSchedule({contest_id: match.contest_id});
  
      let contestHasWinner = contest && contest.winner !== null;
      let matchHasWinner = match && match.winner !== null;
  
      let mismatch = !contestHasWinner && matchHasWinner || contestHasWinner && matchHasWinner && contest.winner.coach.id !== match.winner.coach.id;
  
      if (!contest) {
        dataService.insertSchedule(match); 
      } else if(contest.manual) {
        return;
      } else if (match.status === "played" && contest.match_uuid === null) {
        dataService.updateSchedule({contest_id: match.contest_id}, match);
      } else if (match.status === "played" && mismatch) {
        dataService.updateSchedule({contest_id: match.contest_id}, match);
      } else if (match.status === "scheduled" && match.opponents && (contest.opponents && (match.opponents[0].coach.id !== contest.opponents[0].coach.id
                || match.opponents[1].coach.id !== contest.opponents[1].coach.id ) || !contest.opponents) ){
        dataService.updateSchedule({contest_id: match.contest_id}, match);
      }
    }
    catch(ex){
      loggingService.error(ex);
    }
  }

  async getContests(){

    try {

      let date = new Date(Date.now());
      date.setHours(date.getHours() -8);
      date = `${date.getFullYear()}-${date.getMonth() +1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:00`;

      let matches = await cyanideService.matches({platform:"pc","id_only":1, start:date, league:"Huge Jackedman Memorial"}); //
      if (!matches) return;

      matches = matches.matches.map(x => x.uuid);
      let data = await dataService.getMatches({"uuid":{$in:matches}});
      let found = await dataService.getMatches({"uuid":{$in:matches}},{"uuid":1});
      found = found.map(f => f.uuid);

      let newMatches = matches.filter(x => !found.includes(x));

      data = [];
      await Promise.each(newMatches, async id =>{
        let match = await cyanideService.match({match_id: id});
        if(match) data.push(match);
      });


      Promise.each(data, async m => {
        m.match.competitionname = `Cup 6 - ${m.match.competitionname}`; 
        dataService.insertMatch(m);
      });
      await Promise.each(data, async m => await this.updateTeamsAfterMatch(m));

      let divisions = [...new Set(data.map(m => m.match.competitionname))];
      let rounds = [...new Set(data.map(m => m.match.round))];
      //update competition fixtures
      let options = {platform:"pc", league : "Huge Jackedman Memorial", competition: "", status:"played", exact: 1, limit:200};
      await Promise.each(rounds, async round => 
        await Promise.each(divisions, async division=>{
          options.competition = division.replace("Cup 6 - ", "");
          options.round = round;
         
          let contests = await cyanideService.contests(options);
          if (contests && contests.upcoming_matches){
            await Promise.each(contests.upcoming_matches, async contest =>{
              contest.competition = division;
              contest.league = "HJMC";
              contest.season = "Cup 6";
              await this._parseNewContest(contest);
            });
          }
        })
      );
      let reg = new RegExp(encodeURI("HJMC"),"i");
      cache.keys().map(key => {
        if (reg.test(key)){
          cache.del(key);
        }
      });

    }
    catch (e){
      loggingService.error(e);
    }
    await this.calculateStandingsHJMC("HJMC", "Cup 6", "Huge Jackedman Memorial");
    return false;
  }

  newScore(league, comp, season, coach,team, points, tdDiff){

    const race = this.races.find(x => x.id === team.idraces);

    return {
        id: coach.idcoach,
        name: coach.coachname,
        league: league,
        competition: comp,
        season: season,
        team: team.teamname,
        teamId: team.idteamlisting,
        race: race.name,
        points: points,
        games: 0,
        kills: 0,
        casualties:0,
        completions:0,
        touchdowns:0,
        interceptions:0,
        win: 0,
        loss: 0,
        draw: 0,
        tddiff: tdDiff,
        type:"hjmc"
    };
  } 

  async calculateStandingsHJMC(league, season, ingameLeagueName){
    let schedules = await dataService.getSchedules({league:league, season:season}); //format: "round_robin",

    let competitions = [...new Set(schedules.map(x=>x.competition)) ];

    const l = competitions.length;

    if(this.races.length === 0)
      this.races = await dataService.getRaces(); 

   
    for(let x=0; x<l; x++){
      let c = new RegExp(competitions[x],"i");
      let matches = await dataService.getMatches({"match.leaguename":ingameLeagueName,"match.competitionname":{"$regex":c}});

      /*
        • 3 points for a match win
        • 1 point for a match tie
        • 1 point per SPP earned by a Big Guy on the pitch (this does not include the randomly assigned MVP award)
        • 5 points per opposition Big Guy killed (what’s that, six Ogres on the field, you say? BRING YOUR CHAINSAWS!)
        • 2 bonus points if your Big Guy (not applicable to Ogre's as noted above, but this is applicable to Halflings, Goblins and Khemri) 
            scores more SPP than any other non-big guy player on your team (not including MVP, and a note: that does NOT say “more than or 
            equal to” – it needs to be specifically more than any other player), if two big guys draw for points, you are clearly doing it
            right and Majorbyte can suck it.
        • 5 bonus points per opponent player injured as a direct result of a Big Guy throwing a team-mate at them (Badly hurt or worse). 
            This becomes 10 bonus points if the opposition player is killed (which, of course, becomes 15 points if the player killed is
            a Big Guy…) - I've upped the points values for this because it's so rare that it deserves extra attention
      */
      let coaches = [];

      await Promise.each(matches, async match => {
        let homeScore = match.match.teams[0].roster.reduce((p,c) => p += c.stats.inflictedtouchdowns,0);
        let awayScore = match.match.teams[1].roster.reduce((p,c) => p += c.stats.inflictedtouchdowns,0);

        let homeTeam = match.match.teams[0];
        let awayTeam = match.match.teams[1];

        let homeCoach = this._getCoach(coaches,0,league,competitions[x],season,match.match);
        let awayCoach = this._getCoach(coaches,1,league,competitions[x],season,match.match);


        if (homeScore === awayScore){
          this._processDraw(homeCoach);
          this._processDraw(awayCoach);
        }else if (homeScore > awayScore){
          this._processWin(homeCoach);
          this._processLoss(awayCoach);
          homeCoach.tddiff += homeScore-awayScore;
          awayCoach.tddiff += awayScore-homeScore;
        }else if (homeScore < awayScore){
          this._processWin(awayCoach);
          this._processLoss(homeCoach);
          awayCoach.tddiff += homeScore-awayScore;
          homeCoach.tddiff += awayScore-homeScore;
        }

        homeCoach.points += this._processRoster(homeTeam.roster, homeTeam.idraces);
        awayCoach.points += this._processRoster(awayTeam.roster, awayTeam.idraces);

        this._processKills(homeCoach, awayTeam.roster);
        this._processKills(awayCoach, homeTeam.roster);

        this._processStats(homeCoach, homeTeam.roster);
        this._processStats(awayCoach, awayTeam.roster);
      });

      coaches.filter(c => ["Khemri", "Ogre"].includes(c.race)).map(c => {
        let coachMatches = matches.filter(m => m.match.coaches[0].idcoach === c.id || m.match.coaches[1].idcoach === c.id);
        coachMatches = coachMatches.sort((a,b) => a.uuid > b.uuid ? -1 : 1);

        let lastMatch = coachMatches[0];
        let index = lastMatch.match.coaches[0].idcoach === c.id ? 0 : 1;
        c.points -= this._getPointsDeductionForOgreAndKhemri(lastMatch.match.teams[index].roster);

      });

      coaches = coaches.sort(
        function(a,b){
          //points
          if(a.points > b.points) {return -1;} 
          if (b.points > a.points) {return 1;} 
          
          let pointsA = a.points -a.win *3 - a.draw;
          let pointsB = b.points -b.win *3 - b.draw;

          if(pointsA > pointsB){return -1;} 
          if(pointsB > pointsA){return 1;} 
          
          return 0; 
        });
      
      for(let i=0; i<coaches.length; i++)
        coaches[i].position = i+1;

      if (coaches.length > 0){
        await dataService.removeStandings({"league": new RegExp(league,"i"), "competition":competitions[x], "season":season});
        await dataService.insertStandings(coaches);
      }  
    }

  }

  _getPointsDeductionForOgreAndKhemri(roster){
    let deduction = 0;
    /*
       Khemri teams are now permitted to run all four Tomb Guardians. 
       All four players can contribute points, but at the end of the 3 matches in a round you must deduct points per additional 
       Tomb Guardian after the first from your total score (1TG = no deduction, 2 = -1pt, 3 = -2pt's and 4 = -3pts).
    */
    let guys = roster.filter(x => ["Khemri_TombGuardian","Ogre_Ogre"].includes(x.type));
    deduction = guys.length -1;
    return deduction;
  }

  _getCoach(coaches, index, league, competition, season, match){
    let coach = coaches.find(function (c) {
      return c.id === match.coaches[index].idcoach && c.competition === competition;
    });

    if (!coach) {
      coach = this.newScore(league,competition,season,match.coaches[index],match.teams[index],0,0); 
      coaches.push(coach);
    }

    return coach;
  }

  _processWin(coach) {
    coach.games +=1;
    //• 1 point for a match tie
    coach.points +=3;
    coach.win +=1;
  }
  _processDraw (coach) {
    coach.games +=1;
    //• 1 point for a match tie
    coach.points +=1;
    coach.draw +=1;
  }

  _processLoss (coach) {
    coach.games+=1;
    coach.loss+=1;
  }

  _processRoster(roster, raceId){
    let guys = roster.filter(x => this.BigGuys.indexOf(x.type) > -1 );

    let bonusPointsSPP = false;
    let points = 0;
    if(guys){
      for(let x=0; x<guys.length; x++){
        let guy = guys[x];
        if ([6,11,19].indexOf(raceId) > -1 && (guy.id === null || guy.id === undefined) ) continue;
        let spp = guy.xp_gain - guy.mvp * 5;
        // • 1 point per SPP earned by a Big Guy on the pitch (this does not include the randomly assigned MVP award)
        points += spp;
         
        if (raceId === ogreRaceId) continue;

        if (!bonusPointsSPP){
          /*• 2 bonus points if your Big Guy (not applicable to Ogre's as noted above, but this is applicable to Halflings, Goblins and Khemri) 
                scores more SPP than any other non-big guy player on your team (not including MVP, and a note: that does NOT say “more than or 
                equal to” – it needs to be specifically more than any other player), if two big guys draw for points, you are clearly doing it
                right and Majorbyte can suck it
          */
          let players = roster.filter(p => p.xp_gain - p.mvp * 5 >= spp);
          if (players.length === 1){
            points += 2;
            bonusPointsSPP = true;
          } else if (players.length > 1){
            let l = players.length;
            players = players.filter(x => this.BigGuys.indexOf(x.type) > -1 );
            if (l === players.length){
              points += 2;
              bonusPointsSPP = true;
            }
          }
        }
      }
    }
    return points;
  }

  _processKills(coach,roster){
    let guys = roster.filter(x => this.BigGuys.indexOf(x.type) > -1 );
    //• 5 points per opposition Big Guy killed (what’s that, six Ogres on the field, you say? BRING YOUR CHAINSAWS!)
    return guys.reduce((p,c) => {
      if (c.casualties_state.indexOf("Dead") > -1){
        p.kills++;
        p.points +=5;
      }
      return p;
    },coach);
  }

  _processStats(coach, roster){
    let guys = roster.filter(x => this.BigGuys.indexOf(x.type) > -1 );
    guys.reduce((p,c) =>{
      p.casualties += c.stats.inflictedcasualties;
      p.completions += c.stats.inflictedpasses;
      p.touchdowns += c.stats.inflictedtouchdowns;
      p.interceptions += c.stats.inflictedinterceptions;      

      return p;
    },coach);
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

  async updateTeamsAfterMatch(match){
    let matchTeam1 = match.match.teams[0];
    let matchTeam2 = match.match.teams[1];
    try{

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

    } catch(ex){
      loggingService.error(ex);
    }
  }

  async getTeam(teamName){
    let team = await dataService.getTeam({"team.name":teamName.trim()});

    if (!team){
      const regex = new RegExp(teamName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      team = await dataService.getTeam({"team.name":{"$regex": regex}});
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

    if(this.allSkills.length === 0){
      this.allSkills = await bloodBowlService.getAllSkills();
    }

    await Promise.all(team.roster.map(async function(currentPlayer){
      let levels = [0,6,16,31,51,76,176,1000];
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
          while (levels[player.level] < player.xp + player.xp_gain ){
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
        player.matchplayed = (player.matchplayed || 0) + ( currentPlayer.matchplayed || 0);
        player.xp_gain = (player.xp_gain || 0) + (currentPlayer.xp_gain || 0);
        player.mvp = (player.mvp || 0) + (currentPlayer.mvp || 0);
        if(currentPlayer.casualties_sustained){
          player.casualties_sustained_total = (player.casualties_sustained_total || []).concat(currentPlayer.casualties_sustained);
        }
        
        player.skills = currentPlayer.skills;
        
        player.value = currentPlayer.value; 
        player.xp = currentPlayer.xp;
        player.casualties_state = currentPlayer.casualties_state;
        player.casualties_sustained = currentPlayer.casualties_sustained;
        player.attributes = currentPlayer.attributes;
        
        if(player.attributes.ag === 0) player.attributes.ag = 1;
        if(player.attributes.av === 0) player.attributes.av = 1;
        if(player.attributes.ma === 0) player.attributes.ma = 1;       
        if(player.attributes.st === 0) player.attributes.st = 1;

        player.stats.inflictedstuns = player.stats.inflictedinjuries - player.stats.inflictedcasualties - player.stats.inflictedko; 
        player.stats.sustainedstuns = player.stats.sustainedinjuries - player.stats.sustainedcasualties - player.stats.sustainedko; 

        if (player.casualties_state.indexOf("Dead")>-1){
          player.active =false;
          while (levels[player.level] < player.xp + player.xp_gain ){
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

      let played = team.roster.find(function(p){ return p.id === player.id; },this);

      if(!played){
        player.casualties_sustained = [];
        if(player.casualties_state){
          for(let x= player.casualties_state.length-1; x>-1; x--){
            if (justMng.indexOf(player.casualties_state[x]) > -1 ){
              player.casualties_state.splice(x,1);
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
      return;
    }
    
    if(this.allSkills.length === 0){
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

      if (player && player.casualties_sustained && (player.casualties_sustained.length === 1 && player.casualties_sustained[0] !== "BadlyHurt" 
          || player.casualties_sustained.length === 2 && player.casualties_sustained[0] !== "BadlyHurt" && player.casualties_sustained[1] !== "BadlyHurt") ){
        missingPlayers++;
        missingTV += currentPlayer.value;
        
      }

    },this)).then(() => currentTeam.team.actualTV = team.team.value + missingTV);


    currentTeam.team.rerolls = team.team.rerolls;
    currentTeam.team.value = team.team.value;


    let lonerValue = await bloodBowlService.getLonerCost(currentTeam.team.idraces);
    if (team.team.nbplayers - missingPlayers < 11 ){
      currentTeam.team.nextMatchTV = currentTeam.team.value + (11 -(team.team.nbplayers - missingPlayers)) * lonerValue/1000;
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

}
if (!Promise.each) Promise.each = async (arr, fn) => {for(const item of arr) await fn(item);};

module.exports = new TourneyService();