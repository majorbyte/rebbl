"use strict";
const apiService = require("./apiService.js")
, axios = require('axios')
, cyanideService = require("./CyanideService.js")
, crippleService = require("./crippleService.js")
, dataService = require("./DataService.js").cripple;


//Major'sMix
//MajorTest2

class ChristmasCracker {
  constructor(){
    this.apiKey = process.env['imperiumKey'];
    this.levels = [0,6,16,31,51,76,176,1000];
    this.races = [
      {id:32,name:"MercenaryAristo",abbr:"sbr"},
      {id:33,name:"MercenaryChaos",abbr:"cpp"},
      {id:34,name:"MercenaryChaosGods",abbr:"cgs"},
      {id:35,name:"MercenaryEasterners",abbr:"fea"},
      {id:36,name:"MercenaryElf",abbr:"egc"},
      {id:37,name:"MercenaryExplorers",abbr:"afs"},
      {id:38,name:"MercenaryGoodGuys",abbr:"aog"},
      {id:39,name:"MercenaryHuman",abbr:"hl"},
      {id:40,name:"MercenarySavage",abbr:"vt"},
      {id:41,name:"MercenaryStunty",abbr:"uosp"},
      {id:42,name:"MercenaryUndead",abbr:"au"}
    ];

    this.startingTypes = [
      "MercenaryAristo_HighElf_Lineman",
      "MercenaryAristo_Vampire_Thrall",
      "MercenaryAristo_ChaosDwarf_Hobgoblin",
      "MercenaryAristo_Bretonnia_Lineman",

      "MercenaryChaos_Chaos_Beastman",
      "MercenaryChaos_Skaven_Lineman",
      "MercenaryChaos_DarkElf_Lineman",
      "MercenaryChaos_Underworld_Goblin",

      "MercenaryChaosGods_Chaos_Beastman",
      "MercenaryChaosGods_Nurgle_Rotter",

      "MercenaryEasterners_ChaosDwarf_Hobgoblin",
      "MercenaryEasterners_Orc_Lineman",
      "MercenaryEasterners_Goblin_Goblin",
      "MercenaryEasterners_Skaven_Lineman",
      "MercenaryEasterners_Ogre_Gnoblar",

      "MercenaryElf_ProElf_Lineman",
      "MercenaryElf_HighElf_Lineman",
      "MercenaryElf_DarkElf_Lineman",
      "MercenaryElf_WoodElf_Lineman",

      "MercenaryExplorers_Kislev_Lineman",
      "MercenaryExplorers_Norse_Lineman",
      "MercenaryExplorers_Amazon_Linewoman",
      "MercenaryExplorers_Lizardman_Skink",

      "MercenaryGoodGuys_Bretonnia_Lineman",
      "MercenaryGoodGuys_Human_Lineman",
      "MercenaryGoodGuys_Dwarf_Blocker",
      "MercenaryGoodGuys_Halfling_Halfling",
      "MercenaryGoodGuys_WoodElf_Lineman",

      "MercenaryHuman_Human_Lineman",
      "MercenaryHuman_Bretonnia_Lineman",
      "MercenaryHuman_Kislev_Lineman",
      "MercenaryHuman_Norse_Lineman",
      "MercenaryHuman_Amazon_Linewoman",

      "MercenarySavage_Orc_Lineman",
      "MercenarySavage_Goblin_Goblin",
      "MercenarySavage_Lizardman_Skink",
      "MercenarySavage_Ogre_Gnoblar",

      "MercenaryStunty_Ogre_Gnoblar",
      "MercenaryStunty_Goblin_Goblin",
      "MercenaryStunty_Halfling_Halfling",

      "MercenaryUndead_Undead_Skeleton",
      "MercenaryUndead_Undead_Zombie",
      "MercenaryUndead_Khemri_Skeleton",
      "MercenaryUndead_Vampire_Thrall",

      "MercenarySavage_Goblin_Troll",
      "MercenarySavage_Ogre_Ogre",
      "MercenaryUndead_Undead_Ghoul",
      "MercenaryUndead_Khemri_ThroRa",
      "MercenaryStunty_Goblin_Troll",
      "MercenaryStunty_Halfling_Treeman",
      "MercenaryStunty_Ogre_Ogre"

     ];

     this.bigGuys =[
      "MercenaryAristo_ChaosDwarf_Minotaur",
      "MercenaryChaosGods_Chaos_Minotaur",
      "MercenaryChaosGods_Nurgle_BeastOfNurgle",
      "MercenaryChaos_Chaos_Minotaur",
      "MercenaryChaos_Skaven_RatOgre",
      "MercenaryChaos_Underworld_Troll",
      "MercenaryEasterners_ChaosDwarf_Minotaur",
      "MercenaryEasterners_Goblin_Troll",
      "MercenaryEasterners_Ogre_Ogre",
      "MercenaryEasterners_Orc_Troll",
      "MercenaryEasterners_Skaven_RatOgre",
      "MercenaryExplorers_Kislev_TameBear",
      "MercenaryExplorers_Lizardman_Kroxigor",
      "MercenaryExplorers_Norse_Yhetee",
      "MercenaryGoodGuys_Human_Ogre",
      "MercenaryHuman_Human_Ogre",
      "MercenaryHuman_Kislev_TameBear",
      "MercenaryHuman_Norse_Yhetee",
      "MercenarySavage_Goblin_Troll",
      "MercenarySavage_Lizardman_Kroxigor",
      "MercenarySavage_Ogre_Ogre",
      "MercenarySavage_Orc_Troll",
      "MercenaryStunty_Goblin_Troll",
      "MercenaryStunty_Ogre_Ogre",
      "MercenaryUndead_Khemri_TombGuardian",
      "MercenaryUndead_Undead_Mummy"
     ];
  }

  newCracker(coach,team){

    const race = this.races.find(x => x.id === team.idraces);

    return {
        id: coach.idcoach,
        name: coach.coachname,
        league: "REBBL Off Season",
        competition: "REBBL's Christmas Cracker",
        season: "season 1",
        team: team.teamname || team.name,
        teamId: team.idteamlisting || team.id,
        race: race.name,
        type:"cracker",
        touchdowns:0,
        casualties:0,
        kills:0,
        completions:0,
        surfs:0,
        levels:0,
        matchesPlayed:0,
        streak:0,
        bigGuyTouchdowns:0,
        weapons:0,
        armourBreaks:0,
        matchesLost:0,
        scrooge:0,
        matchesPlayedPacksUsed:0,
        claimedPacks : {nice: 0, naughty:0, filler:0, huge:0, immortal:0}
    };
  } 

  async getCoachInfo(coachName){
    const regex = new RegExp(`^${coachName}$`,"i");

    let coach = await dataService.getStandings({league:/rebbl off season/i, competition:/REBBL's Christmas Cracker/i, name:{$regex:regex}});

    if (coach.length === 0) return null;
    let ret = coach[0];

    if (ret.reviewingTeam && ret.reviewingTeam !== "" ){
      let review = await dataService.getReview({coach:coachName,state:{$ne:"closed"}});
      delete review.reviewers;
      ret.review = review;
    }

    delete ret.touchdowns;
    delete ret.casualties;
    delete ret.kills;
    delete ret.completions;
    delete ret.surfs;
    delete ret.levels;
    delete ret.matchesPlayed;
    delete ret.streak;
    delete ret.bigGuyTouchdowns;
    delete ret.weapons;
    delete ret.armourBreaks;
    delete ret.matchesLost;
    return ret;
  }

  async registerTeam(coach, teamName){

    

    let team = await cyanideService.team({name:teamName});

    if (!team) return [{error:`Unable to find team: ${teamName}`}];

    if(team.team.created !== team.team.datelastmatch) return [{error:"Only new teams allowed"}];

    let result = await this._checkTeam(coach,team);

    if (result.length > 0){
     return result;
    }


    let tickets = await apiService.getTickets(161836);

    if (tickets.ResponseGetTicketRequests.TicketsRequest !== ""){
      if (!Array.isArray(tickets.ResponseGetTicketRequests.TicketsRequest.TicketRequestInfos)){
        tickets.ResponseGetTicketRequests.TicketsRequest.TicketRequestInfos = [tickets.ResponseGetTicketRequests.TicketsRequest.TicketRequestInfos];
      }
      let ticketRequested = tickets.ResponseGetTicketRequests.TicketsRequest.TicketRequestInfos.find(x =>
        x.RowTeam.Name === team.team.name
      );
      if (!ticketRequested) return [{error:"Please request a ticket ingame, join the following:\nLeague: ReBBL Offseason\nCompetition:REBBL's Christmas Cracker"}];
      else { 
        let ticketId = ticketRequested.RowTicketRequest.Id.Value.replace( /\D/g, '');
        await apiService.approveTicket(161836,ticketId ,team.team.id);
      }
    }else{
      return [{error:"Please request a ticket ingame, join the following:\nLeague: ReBBL Offseason\nCompetition:REBBL's Christmas Cracker"}];
    }


    let standing = this.newCracker({idcoach:team.coach.id, coachname:team.coach.name},team.team);
    
    dataService.insertStandings([standing]);

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

    team.roster.map(x => x.startingPlayer = true);
    team.team.roster = team.roster;
            
    dataService.updateTeam({"team.id": team.team.id},team,{upsert:true});

    crippleService.updateTeamPlayers(team);

    return [];
  }

  async _checkTeam(coachName,team){

    const coachEx = new RegExp(`^${coachName}$`,"i");
    let coach = await dataService.getStandings({league:/rebbl off season/i, competition:/REBBL's Christmas Cracker/i, coach:{$regex:coachEx}});

    let race = this.races.find(x => x.id === team.team.idraces);

    let errors =[];

    if (!race) {
      errors.push({error: "You must use a mixed race team."});
      return errors;
    }

    /*if (coachName !== team.coach.name){
      errors.push({error: "This is not your team."});
    }*/

    if (coach.length === 0){
      //No standings found, first time coach registers
      if (team.team.stadiumlevel > 1){
        errors.push({error: "No stadium levels allowed on new teams."});
      }
  
      let types = [...new Set(team.roster.map(p => p.type))];

      /*
Union of Small People teams, who may additionally hire one Goblin Troll, one Halfling Treeman or one Ogre Ogre in their initial roster MercenaryStunty
Afterlife United teams who may additionally hire one Undead Ghoul or one Khemri Thro-Ra in their initial roster.  MercenaryUndead
Violence Together teams, who may additionally hire one Goblin Troll or one Ogre Ogre in their initial roster. MercenarySavage
      */


      types.map(type => {
        let typeName = type.split('_');
        typeName.splice(0,1);
        if (!this.startingTypes.includes(type)) errors.push({error: `Please review your team, ${typeName.join(' ')} not allowed`});
      });

      let typeCount = team.roster.map(p => p.type);
      
      let checkTypes = this.startingTypes.filter(x => x.startsWith(race.name + '_'));
      let length1 = 0; 
      let length2 = 0;
      let length3 = 0;

      switch(race.name){
        case "MercenarySavage":
            length1 = typeCount.filter(x => x === "MercenarySavage_Goblin_Troll").length;
            length2 = typeCount.filter(x => x === "MercenarySavage_Ogre_Ogre").length;

            if (length1 > 0 && length2 > 0 && length3 > 0) errors.push({error: "You may only hire oone Goblin Troll or one Ogre Ogre"});
          break;
        case "MercenaryStunty":
          length1 = typeCount.filter(x => x === "MercenaryStunty_Goblin_Troll").length;
          length2 = typeCount.filter(x => x === "MercenaryStunty_Halfling_Treeman").length;
          length3 = typeCount.filter(x => x === "MercenaryStunty_Ogre_Ogre").length;

          if (length1 > 0 && length2 > 0) errors.push({error: "You may hire only one Goblin Troll, one Halfling Treeman or one Ogre Ogre"});
        break;
        case "MercenaryUndead":
          length1 = typeCount.filter(x => x === "MercenaryUndead_Undead_Ghoul").length;
          length2 = typeCount.filter(x => x === "MercenaryUndead_Khemri_ThroRa").length;

          if (length1 > 0 && length2 > 0) errors.push({error: "You may hire onlye one Undead Ghoul or one Khemri Thro-Ra"});
        break;
      }

      
      checkTypes.map(t => {
        if (["MercenarySavage_Goblin_Troll","MercenarySavage_Ogre_Ogre","MercenaryUndead_Undead_Ghoul","MercenaryUndead_Khemri_ThroRa","MercenaryStunty_Goblin_Troll","MercenaryStunty_Halfling_Treeman","MercenaryStunty_Ogre_Ogre"].includes(t)) return;

        let l = typeCount.filter(x => x ===t);
        
        let expectedLength = 2;
        
        if ("MercenaryUndead_Undead_Zombie" === t){
          let skellieCount = typeCount.filter(x => x ==="MercenaryUndead_Undead_Skeleton");
          
          expectedLength = 4 - skellieCount;

        }

        if("MercenaryUndead_Undead_Skeleton" === t){
          let zombieCount = typeCount.filter(x => x ==="MercenaryUndead_Undead_Zombie");
          
          expectedLength = 2 - zombieCount;
        }

        if (l.length < expectedLength){
          let typeName = t.split('_');
          typeName.splice(0,1);
  
          errors.push({error: `At least ${expectedLength} of type ${typeName.join(' ')} required`});
        }
      });

      if (errors.length > 0) return errors;

    } else {
      // rebuilding a new team.
      return [{error:"Sorry, need manual verification for now"}];
    }
    return [];
  }

  async checkAchievements(){

    if (this.config === null || this.config === undefined){
      this.config = await dataService.getConfiguration({name:"crackerConfig"});
    }

    let coaches = await dataService.getStandings({league:/rebbl off season/i, competition:/REBBL's Christmas Cracker/i});

    let matches = await dataService.getMatches({"match.leaguename":/rebbl off season/i, "match.competitionname":/REBBL's Christmas Cracker/i});


    coaches.map(x => this._resetPoints(x));

    coaches.map(coach => {
      let coachMatches = matches.filter(match => match.match.coaches[0].idcoach === coach.id || match.match.coaches[1].idcoach === coach.id );

      coachMatches = coachMatches.sort((a,b) => a.uuid > b.uuid);

      coachMatches.map(match => {
        let index = match.match.coaches[0].idcoach === coach.id ? 0 : 1;
        //matches lost
        coach.matchesLost += match.match.teams[index].score < match.match.teams[Math.abs(index-1)].score ? 1 : 0;
      });

      if (coachMatches.length >= 2) {
        coach.initPack = 1;
      }

      coachMatches.splice(0,2);

      coachMatches.map(match => {
        let index = match.match.coaches[0].idcoach === coach.id ? 0 : 1;

        this._processCoach(coach, match.match.teams[index]);
      });

      let total = matches.filter(m => m.match.coaches[0].idcoach === coach.id || m.match.coaches[1].idcoach === coach.id );
      coach.matchesPlayed = total.length;

      total = matches.filter(m => m.match.teams[0].idteamlisting === coach.teamId || m.match.teams[1].idteamlisting === coach.teamId );
      coach.streak = total.length;

      this._calculatePacks(coach);
    });

    await dataService.removeStandings({league:/rebbl off season/i, competition:/REBBL's Christmas Cracker/i});
    await dataService.insertStandings(coaches);

  }

  _processCoach(coach, team){

    coach.touchdowns += team.inflictedtouchdowns;
    coach.casualties += team.inflictedcasualties;
    coach.kills += team.inflicteddead;
    coach.completions += team.inflictedpasses;
    coach.surfs += team.inflictedpushouts;
    coach.armourBreaks += team.sustainedinjuries;
    coach.streak++;

    let secretWeapons = team.roster.filter(x => x.skills.includes("SecretWeapon"));
    coach.weapons += secretWeapons.length;
    
    team.roster.map(player => {
      if (!this.startingTypes.includes(player.type)) return;

      let xp = player.xp + player.xp_gain;
      if (xp >= this.levels[player.level+1]) coach.levels++;
      if (xp >= this.levels[player.level+2]) coach.levels++;
    });

    team.roster.map(player => coach.bigGuyTouchdowns += this.bigGuys.includes(player.type) ? player.stats.inflictedtouchdowns : 0 );

    this._processScrooge(coach,team);
  }

  _resetPoints(coach){
    coach.touchdowns =0;
    coach.casualties =0;
    coach.kills =0;
    coach.completions =0;
    coach.surfs =0;
    coach.levels =0;
    coach.matchesPlayed =0;
    coach.streak =0;
    coach.bigGuyTouchdowns =0;
    coach.weapons =0;
    coach.armourBreaks =0;
    coach.matchesLost =0;
  }

  _calculatePacks(coach){
    coach.touchdownsPacks = Math.floor(coach.touchdowns/this.config.step.touchdowns); 
    coach.casualtiesPacks = coach.casualties >= this.config.init.casualties ? 1 + Math.floor((coach.casualties-this.config.init.casualties) / this.config.step.casualties) : 0; 
    coach.killsPacks = coach.kills >= this.config.init.kills ? 1 + Math.floor((coach.kills-this.config.init.kills) / this.config.step.kills) : 0; 
    coach.completionsPacks = coach.completions >= this.config.init.completions ? 1 + Math.floor((coach.completions-this.config.init.completions) / this.config.step.completions) : 0; 
    coach.surfsPacks = coach.surfs >= this.config.init.surfs ? 1 + Math.floor((coach.surfs-this.config.init.surfs) / this.config.step.surfs) : 0; 
    coach.levelsPacks = coach.levels >= this.config.init.levels ? 1 + Math.floor((coach.levels-this.config.init.levels) / this.config.step.levels) : 0; 
    coach.matchesPlayedPacks = Math.floor(coach.matchesPlayed/this.config.step.matchesPlayed); 
    coach.streakPacks = coach.streak >= this.config.init.streak ? 1 + Math.floor((coach.streak-this.config.init.streak) / this.config.step.streak) : 0;  
    coach.bigGuyTouchdownsPacks = coach.bigGuyTouchdowns >= this.config.init.bigGuyTouchdowns ? 1 + Math.floor((coach.bigGuyTouchdowns-this.config.init.bigGuyTouchdowns) / this.config.step.bigGuyTouchdowns) : 0;  
    coach.weaponsPacks = coach.weapons >= this.config.init.weapons ? 1 + Math.floor((coach.weapons-this.config.init.weapons) / this.config.step.weapons) : 0; 
    coach.armourBreaksPacks = coach.armourBreaks >= this.config.init.armourBreaks ? 1 + Math.floor((coach.armourBreaks-this.config.init.armourBreaks) / this.config.step.armourBreaks) : 0;  
    coach.matchesLostPacks = coach.matchesLost >= this.config.init.matchesLost ? 1 + Math.floor((coach.matchesLost-this.config.init.matchesLost) / this.config.step.matchesLost) : 0; 

  }

  _processScrooge(coach, team){
    let scrooges = team.roster.filter(x => x.name === "Scrooge");
    if (scrooges.length !== 1) return;

    coach.scrooge = scrooges[0].xp + scrooges[0].xp_gain;
  }

  async claimPacks(coachName){
    const coachEx = new RegExp(`^${coachName}$`,"i");
    let coach = await dataService.getStandings({league:/rebbl off season/i, competition:/REBBL's Christmas Cracker/i, name:{$regex:coachEx}});
    coach = coach[0];

    if (coach.rebuilding) return;
    coach.rebuilding = true;
    dataService.updateStanding({competition:/REBBL's Christmas Cracker/i, name:coach.name},coach,{upsert:true});

    //Nice
    let nice = coach.touchdownsPacks + coach.completionsPacks + coach.levelsPacks + coach.armourBreaksPacks + (coach.initPack || 0);

    //Naughty
    let naughty = coach.casualtiesPacks + coach.killsPacks + coach.surfsPacks + coach.weaponsPacks;

    //Filler
    let filler = coach.matchesPlayedPacks;
    let streak = coach.streakPacks;

    //Huge Bonus
    let huge = coach.bigGuyTouchdownsPacks;

    //Immortal
    let immortal = coach.matchesLostPacks;

    //adjust for previously claimed packs
    if (coach.claimedPacks){
      nice -= coach.claimedPacks.nice;
      naughty -= coach.claimedPacks.naughty;
      filler -= coach.claimedPacks.filler;
      huge -= coach.claimedPacks.huge;
      immortal -= coach.claimedPacks.immortal;
    }

    if (!coach.claimedPacks){
      coach.claimedPacks = {nice: nice, naughty:naughty, filler:filler, huge:huge, immortal:immortal};
    } else{
      coach.claimedPacks.nice += nice;
      coach.claimedPacks.naughty += naughty;
      coach.claimedPacks.filler += filler;
      coach.claimedPacks.huge += huge;
      coach.claimedPacks.immortal += immortal;
    }

    let race = this.races.find(x => x.name === coach.race);

    
    let body = {
      pack_type: "nice",
      team: race.abbr
    };
    const url = `https://imperium.rebbl.net/api/cracker/cards/${coach.name}`;
    const options = {headers: {"Content-Type": "application/json", "CRACKER-API-KEY": this.apiKey}};

    await axios.delete(url,options);

    let createPacks = async function(type,count){
      body.pack_type = type;
      for(let i = count; i>0; i--){
        let result = await axios.post(url,body, options);
        console.dir(result);
      }
    };
    await createPacks("nice",nice);
    await createPacks("naughty",naughty);
    await createPacks("stocking filler",filler + streak);
    await createPacks("huge bonus",huge);
    await createPacks("immortal",immortal);
    coach.rebuilding = true;

    dataService.updateStanding({competition:/REBBL's Christmas Cracker/i, name:coach.name},coach,{upsert:true});

    return await this.getPacks(coachName);

  }

  async getPacks(coachName){
    const url = `https://imperium.rebbl.net/api/cracker/cards/${coachName}`;
    const options = {headers: {"Content-Type": "application/json", "CRACKER-API-KEY": this.apiKey}};
    let result = await axios.get(url,options);
    if (result.status === 200) return result.data;
    return [];
  }

  async fixTeam(){
    let coaches = await dataService.getStandings({league:/rebbl off season/i, competition:/REBBL's Christmas Cracker/i});

    for(let coach of coaches){
      let team = await dataService.getTeam({"team.id":coach.teamId});
      if (!team) console.dir(coach);
      else {
        await dataService.removePlayers({teamId:team.team.id});
        await crippleService.updateTeamPlayers(team);
      }

    }

  }

  async createReview(review){
    review.state = "open";
    review.reviewers = [];
    review.reviewComments = [];
    review.result = [];

    const coachEx = new RegExp(`^${review.coach}$`,"i");
    let coach = await dataService.getStandings({league:/rebbl off season/i, competition:/REBBL's Christmas Cracker/i, coach:{$regex:coachEx}});

    coach.reviewingTeam = review.newTeam.team.name;

    dataService.updateStanding({competition:/REBBL's Christmas Cracker/i, name:coach.name},coach,{upsert:true});

    dataService.insertReview(review);
  }

  async getReview(coachName){
      let review = await dataService.getReview({coach:{$ne:coachName},reviewers:{$ne:coachName}, state:{$ne:"closed"}});
      if (review){
        let coach = await dataService.getStandings({league:/rebbl off season/i, competition:/REBBL's Christmas Cracker/i, id:review.newTeam.coach.id});
        let team = await dataService.getTeam({"team.id":coach[0].teamId});
        review.currentTeam = team;
        
        const url = `https://imperium.rebbl.net/api/cracker/cards/${review.newTeam.coach.name}`;
        const options = {headers: {"Content-Type": "application/json", "CRACKER-API-KEY": this.apiKey}};
        let result = await axios.get(url,options);
        if (result.status === 200){

          review.cards = result.data.map(x => {
            let card = x.cracker_template;
            card.cardId = x.id;
            return card;
          });
        }
      }


      return review;
  }

  async processReview(coachName){
    const coachEx = new RegExp(`^${coachName}$`,"i");
    let coach = await dataService.getStandings({league:/rebbl off season/i, competition:/REBBL's Christmas Cracker/i, coach:{$regex:coachEx}});

    let threshold = Date.now();

    threshold.setHours(threshold.getHours()-24);

    if (!coach.firstReview || coach.firstReview < threshold){
      coach.firstReview = Date.now();
      coach.currentReviewCount = 1;
      coach.totalReviewCount = (coach.totalReviewCount||0) +1;
    } else if (coach.firstReview > threshold && coach.currentReviewCount < 3 ){
      coach.currentReviewCount++;
      coach.totalReviewCount++;
    }

  }

  async getCheaters(){
    let matches = await dataService.getMatches({"match.leaguename":/rebbl off season/i, "match.competitionname":/REBBL's Christmas Cracker/i});

    let teams = [...new Set(matches.map(x => x.match.teams[0].idteamlisting))];

    let players = await dataService.getPlayers({teamId:{$in:teams},active:false, casualties_state:{$ne:"Dead"},id:{$ne:null}, matchplayed:{$exists:true}});

    let cheaters =[];
    teams.map(id => {
      let teamMatches = matches.filter(m => m.match.teams.some(t => t.idteamlisting === id));
      let teamPlayers = players.filter(p => p.teamId === id);

      teamPlayers.map(p => {
        let playerMatches = matches.filter(m => m.match.teams.some(t => t.roster.some(player => player.id === p.id)));
        if (playerMatches.length !== teamMatches.length){
          cheaters.push(p);
        }
      });

    });

    cheaters.map(async cheater =>{
      let team = await dataService.getTeam({"team.id":cheater.teamId});
      console.log(`coach ${team.coach.name} fired ${cheater.name} (${cheater.type}) of the team ${team.team.name}. ${cheater.casualties_state.length > 0 ? `Player had the follow casualties: ${cheater.casualties_state.join(', ')}` : ''}`);
    });

    console.dir(cheaters);
  }

  async fixRebuilders(){
    let coaches = await dataService.getStandings({league:/rebbl off season/i, competition:/REBBL's Christmas Cracker/i, rebuilding:true});
    let matches = await dataService.getMatches({"match.leaguename":/rebbl off season/i, "match.competitionname":/REBBL's Christmas Cracker/i});

    matches = matches.sort((a,b) => b.uuid > a.uuid ? 1 : -1);


    for(let coach of coaches){
    
      let lastMatch = matches.find(x => x.coaches[0].id === coach.id || x.coaches[1].id === coach.id );
    
      if (!lastMatch){
        console.log(coach.name);
        continue;
      }
      
      let index = coach.id === lastMatch.coaches[0].id ? 0 : 1;

      if (lastMatch.teams[index].id !== coach.teamId){

        console.log(`${coach.name} changed from  ${coach.team} to ${lastMatch.teams[index].name}`);

        if (coach.generation) coach.generation +=1;
        else coach.generation = 1;  
        coach.teamId = lastMatch.teams[index].id;
        coach.team = lastMatch.teams[index].name;
        coach.manualCorrected = true;

        dataService.updateStanding({competition:/REBBL's Christmas Cracker/i, name:coach.name},coach,{upsert:true});

      }

    }

  }

}

module.exports = new ChristmasCracker();