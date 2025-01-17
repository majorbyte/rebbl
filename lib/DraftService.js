"use strict";
const accountService = require("./accountService.js")
, bb3Service = require("./bb3Service.js")
, axios = require('axios')
, clanService = require("./ClanService.js")
, cyanideService = require("./CyanideService.js")
, dataService = require("./DataService.js").rebbl
, FormData = require('form-data');

class Draft {
  constructor(){
    this.apiUrl = process.env["BB3Url"];
    this.leagueId = "05004f31-9d5a-11ef-aaf1-bc24112ec32e";

    this.races = [];
    this.redditAuthToken = '';
  }

  async getDraft(userName, division, round, house){
    const account = await accountService.getAccount(userName);
    const clan = await clanService.getClanByUser(account.bb3coach); 
    const leader = await accountService.hasRole(userName, "clanleader");
    let schedule;
    if (division && round && house){
      schedule = await dataService.getSchedule({season:/season 19/i,league:"clan",competition:division, round:Number(round), house: Number(house)});
    }
    else{
      if (!clan) return;
      schedule = await dataService.getSchedule({season:/season 19/i,drafted:false,league:"clan",$or:[{"home.clan":clan.name},{"away.clan":clan.name}]},{sort:{round:1},limit:1});
    }

    let clans = await dataService.getClans({active:true,name:{$in:[ RegExp(`^${schedule.home.clan}$`,"i"),RegExp(`^${schedule.away.clan}$`,"i")]}});

    schedule.home.clan = clans.find(c => c.name.localeCompare(schedule.home.clan,undefined,{sensitivity:"base"})=== 0);
    schedule.away.clan = clans.find(c => c.name.localeCompare(schedule.away.clan,undefined,{sensitivity:"base"})=== 0);

    let teams = await dataService.getTeams({"team.id":{$in:schedule.home.clan.ledger.teams.filter(team => team.active).map(team=> team.team.id).concat(schedule.away.clan.ledger.teams.filter(team => team.active).map(team=> team.team.id))}});

    const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: "base"});
    for(var x = 0; x <5; x++){
      schedule.home.clan.teams[x] = teams.find(t => collator.compare(t.team.name,schedule.home.clan.teams[x]) === 0 );
      schedule.away.clan.teams[x] = teams.find(t => collator.compare(t.team.name,schedule.away.clan.teams[x]) === 0);
    }

    const draft = await dataService.getDraft({season:/season 19/i,competition:schedule.competition, round:schedule.round, house: schedule.house});
    if (draft){
      schedule.contests = draft.contests;
      schedule.usedPowers = draft.powers;
    }

    for(const team of schedule.home.clan.teams){
      delete team.team.roster
    }
    for(const team of schedule.away.clan.teams){
      delete team.team.roster
    }

    return {schedule, leader};
  }

  async saveDraft(userName, draft){

    const query = {
      house: draft.house,
      round: draft.round,
      competition: draft.competition,
      season: draft.season
    };

    let savedDraft = await dataService.getDraft({season:/season 19/i,competition:draft.competition, round:draft.round, house: draft.house});
    if (savedDraft && savedDraft.confirmed) throw new Error("This draft is already confirmed!");

    const account = await accountService.getAccount(userName);    
    let clan = await clanService.getClanByUser(account.bb3coach); 
    if (!clan) clan = await clanService.getClanByLeader(account.bb3coach);
    const schedule = await dataService.getSchedule(query);

    const isAdmin = await accountService.hasRole(userName, "clanadmin", "admin");

    if (!isAdmin && (!clan || clan.name !== schedule.home.clan && clan.name !== schedule.away.clan))
      throw new Error("You are not the clan leader for either clan!");

    let confirmByClan = "";
    
    if (clan && clan.name === schedule.home.clan) confirmByClan = schedule.away.clan;
    else confirmByClan = schedule.home.clan;

    clan = await dataService.getClan({name:confirmByClan, season:"season 19"});

    draft.confirmed = false;
    draft.confirmationBy = clan.leader;

    dataService.updateDraft(query, draft, {upsert:true});
  }
  
  async confirmDraft(userName, data){
    const query = {
      house: data.house,
      round: data.round,
      competition: data.competition,
      season: data.season
    };

    //check if userName is requested user to confirm
    const draft = await dataService.getDraft(query);
    if (draft && draft.confirmed) throw new Error("This draft is already confirmed!");

    const isAdmin = await accountService.hasRole(userName, "clanadmin", "admin");

    if (!isAdmin){
      const account = await accountService.getAccount(userName);    
      if (draft.confirmationBy.localeCompare(account.bb3coach,undefined,{sensitivity:'base'}) !== 0 ){
        throw new Error(`Only coach ${draft.confirmationBy} can confirm this draft.`);
      }
    }

    //Set draft to confirmed, so parallel requests have less of chance to wreck havock
    dataService.updateDraft(query, {$set:{confirmed:true, confirmedBy:userName}});

    // Draft powers that require a match
    await this.#registerPowers(draft);

    /*const unstarted =*/ await this.createGames(draft,query);

    dataService.updateSchedule(query, {$set:{drafted:true}});

    this.postToReddit(draft);
  }

  async createGames(draft,query){
    for(const [index, contest] of draft.contests.entries()) {
      let competition_name = `Div${draft.competition.split(" ")[1]} R${draft.round} H${draft.house} G${index+1}`;

      let result = await cyanideService.lookup({competition_name});

      if (result.competitions.some(x => x.name == competition_name)) continue;

      await this.#createContest(draft.competition, draft.house, draft.round, index+1, contest);
    }
  
    await clanService.updateUnstarted(query.division,query.round,query.house);
  }

  

  async #registerPowers(draft){
    //for(const eRnR of draft.powers.home.emergencyRnR) await this.#processRnR(draft.competition, eRnR);
    //for(const eRnR of draft.powers.away.emergencyRnR) await this.#processRnR(draft.competition, eRnR);

    for(const side in draft.powers){
      const powers = draft.powers[side];
      for(const power in powers){
        const amount = Array.isArray(powers[power]) ? powers[power].length : powers[power];
        await this.#registerPower(power, amount, side === "home",draft.competition,draft.round,draft.house);

        //if(power === "assassination" || power === "stuntyAssassination"){
        //  for(const assassination of powers[power]){
        //    dataService.updatePlayer({teamId: assassination.team.id, id:assassination.player.id},{$set:{assassinated:true}});
        //  }
        //}
      }
    }    
  }

  async #registerPower(power, amount, isHome,competition,round,house){
    
    let schedule = await dataService.getSchedule({
      league:"clan", 
      season:"season 19",
      competition:competition,
      round:Number(round),
      house:Number(house)
    });
    const updatePowers = function(side,power,qty){
      if(!side.usedPowers) {
        side.usedPowers = {};
      }
      if(side.usedPowers[power]) side.usedPowers[power]+=qty;
      else side.usedPowers[power] = qty;
    };

    if (isHome){
      updatePowers(schedule.home, power, amount);
      dataService.updateSchedule({_id:schedule._id},{$set:{"home.usedPowers":schedule.home.usedPowers}});
    }else{
      updatePowers(schedule.away, power, amount);
      dataService.updateSchedule({_id:schedule._id},{$set:{"away.usedPowers":schedule.away.usedPowers}});
    }

    const clanName = isHome ? schedule.home.clan : schedule.away.clan;
    let clan = await dataService.getClan({name:clanName, active:true});

    clan.powers[power] -= amount;
    if (clan.powers[power] < 0) clan.powers[power] = 0;
    dataService.updateClan({name:clan.name, active:true},{$set:{powers:clan.powers}});
  }

  async #processRnR(emergency){
    let name = `rnr ${emergency.team.name.substr(0,21)}`;
  }

  async #createContest(competition, house, round, game, contest){
    let name = `Div${competition.split(" ")[1]} R${round} H${house} G${game}`;

    const getTeam = (team) =>({id: team.id, coachId: team.idcoach});
  
    await this.#setupCompetition(name, getTeam(contest.homeTeam.team), getTeam(contest.awayTeam.team));
  }

  async #setupCompetition(name){
    const competitionId = await this.#createCompetition(name);

    if (competitionId === -1) return;
    let teams = Array.prototype.slice.call(arguments, 1);
    
    for(let team of teams){
      try{
        await bb3Service.inviteTeam(competitionId, team.coachId, team.id);
      } catch(err){
        console.trace(err);
      }
    }
  }

  async #createCompetition(name){

    try{

      let response = await fetch(`${this.apiUrl}/api/competition`,{
        method: "POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          name: name,
          competitionFormat: 2,
          leagueId:this.leagueId
        })
      });
  
      if (!response.ok) throw new Error("Could not create competition");
  
      let result = await response.json();
      
      const settingId = result.responseCreateCompetition.competition.settingId;
      const newCompetitionId = result.responseCreateCompetition.competition.id;
      const timer = 5; //strict 4 minutes
      const participants = 2;
  
      await fetch(`${this.apiUrl}/api/competition/${settingId}/participants/${participants}`,{
        method: "PUT",
        headers:{"Content-Type":"application/json"}
      });
  
      await fetch(`${this.apiUrl}/api/competition/${settingId}/timer/${timer}`,{
        method: "PUT",
        headers:{"Content-Type":"application/json"}
      });
  
      await fetch(`${this.apiUrl}/api/competition/${settingId}/automaticAdvancement`,{
        method: "PUT",
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
  
      return newCompetitionId;
    } catch(err){
      console.error(err);
    }

  }

  async postToReddit(draft){

    const post = await this.getSchedulingPost(draft.round);

    const query = {
      house: draft.house,
      round: draft.round,
      competition: draft.competition,
      season: draft.season
    };

    const schedule = await dataService.getSchedule(query);

    const homeClan = await dataService.getClan({name:schedule.home.clan, active:true});
    const awayClan = await dataService.getClan({name:schedule.away.clan, active:true});


    const msg = await this.getRedditSummary(draft,homeClan,awayClan);

    const summary = await this.postSummary(`${post.kind}_${post.data.id}`, msg);

    dataService.updateSchedule(query,{$set:{redditLink:summary.permalink}});

    const redditUsers = await this.getRedditUsers(draft,homeClan,awayClan);
    for(const users of redditUsers){
      await this.postComment(summary.fullname,users);
      await new Promise(resolve => setTimeout(resolve, 5500));
    }
  }

  async getAuthToken(){
    const formData = new FormData();

    formData.append('grant_type','password');
    formData.append('username',process.env["redditUsername"]);
    formData.append('password',process.env["redditPassword"]);

    const options = {
      baseURL: 'https://www.reddit.com',
      url: '/api/v1/access_token',
      method: 'POST',
      data:formData,
      headers: {
          'User-Agent': 'RebblPlanner Script Scheduling parser',
          'Content-Type':`multipart/form-data; boundary=${formData._boundary}`,
          'Authorization': 'Basic ' + Buffer.from(process.env["rebblPlannerKey"] + ':' + process.env["rebblPlannerSecret"]).toString('base64')
      }
    };

    const response = await axios(options);
    this.redditAuthToken = response.data.access_token;
  }

  async getSchedulingPost(round) {
    await this.getAuthToken();
    const config = {
      baseURL: 'https://oauth.reddit.com/',
      url: '/r/rebbl/search',
      params:{
        q:"flair:Clan Announcement",
        restrict_sr:"on",
        sort:"new",
        t:"all",
        limit:20
      },
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + this.redditAuthToken,
        'User-Agent': 'RebblPlanner Script Scheduling parser',
        'Content-Type':'application/x-www-form-urlencoded'
      }
    };

    let response = await axios(config);

    let post = response.data.data.children.find(x => x.data.title.toLowerCase() === `clan season 19 week ${round}`)

    if (!post) 
    {
      config.params.q = "flair:Clan announcement";
      response = await axios(config);
      post = response.data.data.children.find(x => x.data.title.toLowerCase() === `clan season 19 week ${round}`)
    }
    return post;
  }

  async postSummary(fullname,text){
    const formData = new FormData();

    formData.append('api_type','json');
    formData.append('text',text);
    formData.append('thing_id',fullname);
    formData.append('return_rtjson',"true");

    const config = {
      baseURL: 'https://oauth.reddit.com',
      url: '/api/comment',
      method: 'POST',
      data:formData,  
      headers: {
          'User-Agent': 'RebblPlanner Script Scheduling parser',
          'Content-Type':`multipart/form-data; boundary=${formData._boundary}`,
          'Authorization': 'Bearer ' + this.redditAuthToken
        }
    };    
    const response = await axios(config);

    const result = {fullname:response.data.name, permalink:response.data.permalink};

    await this.toggleReplies(`t1_${result.fullname}`,"false");

    return result;
  }

  async toggleReplies(fullname,state){
    const formData = new FormData();

    formData.append('id',fullname);
    formData.append('state',state);

    const config = {
      baseURL: 'https://oauth.reddit.com',
      url: '/api/sendreplies',
      method: 'POST',
      data:formData,  
      headers: {
          'User-Agent': 'RebblPlanner Script Scheduling parser',
          'Content-Type':`multipart/form-data; boundary=${formData._boundary}`,
          'Authorization': 'Bearer ' + this.redditAuthToken
        }
    };    
    const result = await axios(config);
  }

  async postComment(fullname,text){
    const formData = new FormData();

    formData.append('api_type','json');
    formData.append('text',text);
    formData.append('thing_id',fullname);

    const config = {
      baseURL: 'https://oauth.reddit.com',
      url: '/api/comment',
      method: 'POST',
      data:formData,
      headers: {
          'User-Agent': 'RebblPlanner Script Scheduling parser',
          'Content-Type':`multipart/form-data; boundary=${formData._boundary}`,
          'Authorization': 'Bearer ' + this.redditAuthToken
        }
    };    
    await axios(config);
  }

  async getRedditSummary(draft, homeClan, awayClan){
    if(this.races.length === 0) this.races = await dataService.getRaces();

    return `# ${homeClan.name} v ${awayClan.name}
### Matchups    
${this.getRedditMatches(draft,homeClan,awayClan).join(" ")}    

[Draft Result](https://rebbl.net/clandraft/?division=${draft.competition}&round=${draft.round}&house=${draft.house})`;
  }

  getRedditMatches(draft,homeClan,awayClan){

    return draft.contests.map(contest => this.getRedditMatch(contest,homeClan,awayClan));
  }

  getRedditMatch(contest,homeClan,awayClan){
    return `${this.getRedditHomeMatch(contest.homeTeam,homeClan)} vs. ${this.getRedditAwayMatch(contest.awayTeam,awayClan)}    \r\n`;
  }

  getRedditHomeMatch(team,clan){
    const coach = clan.members.find(m => m.coachId === team.team.idcoach);
    return `${coach?.reddit || 'unknown'} [${team.team.name}](https://rebbl.net/team/${team.team.id})`;
  }

  getRedditAwayMatch(team,clan){
    const coach = clan.members.find(m => m.coachId === team.team.idcoach);
    return `[${team.team.name}](https://rebbl.net/team/${team.team.id}) ${coach?.reddit || 'unknown'}`;
  }

  getRace(id){
    return this.races.find(x => x.id === id).name;
  }

  getRedditUsers(draft,homeClan,awayClan){
    return draft.contests.map(contest => `${this.getRedditUser(contest.homeTeam.team,homeClan)} vs. ${this.getRedditUser(contest.awayTeam.team,awayClan)} schedule here`);
  }

  getRedditUser(team,clan){
    const coach = clan.members.find(m => m.coachId === team.idcoach);
    return coach ? `/u/${coach.reddit}` : "unknown";
  }
}

module.exports = new Draft();
