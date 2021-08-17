"use strict";
const accountService = require("./accountService.js")
, apiService = require("./apiService.js")
, axios = require('axios')
, clanService = require("./ClanService.js")
, configurationService = require("./ConfigurationService.js")
, dataService = require("./DataService.js").rebbl
, FormData = require('form-data');

class Draft {
  constructor(){
    this.races = [];
    this.redditAuthToken = '';
  }

  async getDraft(userName, division, round, house){
    const account = await accountService.getAccount(userName);
    const clan = await clanService.getClanByUser(account.coach); 
    const leader = await accountService.hasRole(userName, "clanleader");
    let schedule;
    if (division && round && house){
      schedule = await dataService.getSchedule({season:/season 11/i,league:"clan",competition:division, round:Number(round), house: Number(house)});  
    }
    else{
      if (!clan) return;
      schedule = await dataService.getSchedule({season:/season 11/i,drafted:false,league:"clan",$or:[{"home.clan":clan.name},{"away.clan":clan.name}]},{sort:{round:1},limit:1});      
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

    const draft = await dataService.getDraft({season:/season 11/i,competition:schedule.competition, round:schedule.round, house: schedule.house});
    if (draft){
      schedule.contests = draft.contests;
      schedule.usedPowers = draft.powers;
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

    let savedDraft = await dataService.getDraft({season:/season 11/i,competition:draft.competition, round:draft.round, house: draft.house});
    if (savedDraft && savedDraft.confirmed) throw new Error("This draft is already confirmed!");

    const account = await accountService.getAccount(userName);    
    let clan = await clanService.getClanByUser(account.coach); 
    if (!clan) clan = await clanService.getClanByLeader(account.coach);
    const schedule = await dataService.getSchedule(query);

    const isAdmin = await accountService.hasRole(userName, "clanadmin", "admin");

    if (!isAdmin && (!clan || clan.name !== schedule.home.clan && clan.name !== schedule.away.clan))
      throw new Error("You are not the clan leader for either clan!");

    let confirmByClan = "";
    
    if (clan && clan.name === schedule.home.clan) confirmByClan = schedule.away.clan;
    else confirmByClan = schedule.home.clan;

    clan = await dataService.getClan({name:confirmByClan, season:"season 11"});

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
      if (draft.confirmationBy.localeCompare(account.coach,undefined,{sensitivity:'base'}) !== 0 ){
        throw new Error(`Only coach ${draft.confirmationBy} can confirm this draft.`);
      }
    }

    //Set draft to confirmed, so parallel requests have less of chance to wreck havock
    dataService.updateDraft(query, {$set:{confirmed:true, confirmedBy:userName}});

    // Draft powers that require a match
    await this.registerPowers(draft);

    const unstarted = await this.createGames(draft,data);

    dataService.updateSchedule(query, {$set:{unstarted: unstarted, drafted:true}});

    this.postToReddit(draft);
  }

  async createGames(draft,data){
    for(const [index, contest] of draft.contests.entries()) await this.createContest(draft.competition, draft.house, draft.round, index+1, contest);
  
    let competitionsInformation = await clanService.getCompetitionInformation(data.competition,data.round,data.house,false);

    competitionsInformation = competitionsInformation.filter(x => x.Row.CompetitionStatus === "0");


    const mapCompetitionInformation = function(competition){
      return {
        coachId: Number(competition.RowTeam.IdCoach),
        coachName: competition.NameCoach || competition.Coach.User,
        logo: competition.RowTeam.Logo,
        teamId: Number(competition.RowTeam.ID.Value.replace(/\D/g,"")),
        teamName: competition.RowTeam.Name
      };
    };

    return competitionsInformation.map(x => {
      return {
        competitionId : Number(x.Row.Id.Value.replace(/\D/g,"")),
        competitionName: x.Row.Name,
        coaches: x.participants.map(mapCompetitionInformation).concat(x.tickets.map(mapCompetitionInformation))
      };
    });    
  }

  async registerPowers(draft){
    for(const assassination of draft.powers.home.assassination) await this.createAssassinationCompetition(draft.competition, assassination);
    for(const assassination of draft.powers.away.assassination) await this.createAssassinationCompetition(draft.competition, assassination);
    for(const assassination of draft.powers.home.stuntyAssassination) await this.createAssassinationCompetition(draft.competition, assassination);
    for(const assassination of draft.powers.away.stuntyAssassination) await this.createAssassinationCompetition(draft.competition, assassination);

    for(const eRnR of draft.powers.home.emergencyRnR) await this.createEmergencyRnRCompetition(draft.competition, eRnR);
    for(const eRnR of draft.powers.away.emergencyRnR) await this.createEmergencyRnRCompetition(draft.competition, eRnR);

    for(const inspiration of draft.powers.home.inspiration) await this.createInspirationCompetition(draft.competition, inspiration);
    for(const inspiration of draft.powers.away.inspiration) await this.createInspirationCompetition(draft.competition, inspiration);
    for(const inspiration of draft.powers.home.stuntyInspiration) await this.createInspirationCompetition(draft.competition, inspiration);
    for(const inspiration of draft.powers.away.stuntyInspiration) await this.createInspirationCompetition(draft.competition, inspiration);

    for(const sacrifice of draft.powers.home.bloodSacrifice) await this.createBloodSacrificeCompetition(draft.competition, sacrifice);
    for(const sacrifice of draft.powers.away.bloodSacrifice) await this.createBloodSacrificeCompetition(draft.competition, sacrifice);

    for(const side in draft.powers){
      const powers = draft.powers[side];
      for(const power in powers){
        const amount = Array.isArray(powers[power]) ? powers[power].length : powers[power];
        await this.registerPower(power, amount, side === "home",draft.competition,draft.round,draft.house);

        if(power === "assassination" || power === "stuntyAssassination"){
          for(const assassination of powers[power]){
            dataService.updatePlayer({teamId: assassination.team.id, id:assassination.player.id},{$set:{assassinated:true}});
          }
        }
      }
    }    
  }

  async registerPower(power, amount, isHome,competition,round,house){
    
    let schedule = await dataService.getSchedule({
      league:"clan", 
      season:"season 11", 
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
    dataService.updateClan({name:clan.name, active:true},{$set:{powers:clan.powers}});
  }

  async createAssassinationCompetition(competition, assassination){
    let name = `asn ${assassination.player.name.substr(0,21)}`;
    await this.setupCompetition(this.getPowerLeagueId(competition), name, assassination.team);
  }
  async createEmergencyRnRCompetition(competition, emergency){
    let name = `rnr ${emergency.team.name.substr(0,21)}`;
    await this.setupCompetition(this.getPowerLeagueId(competition), name, emergency.team);
  }
  async createInspirationCompetition(competition, inspiration){
    let name = `ins ${inspiration.player.name.substr(0,21)}`;
    await this.setupCompetition(this.getPowerLeagueId(competition), name, inspiration.team);
  }
  async createBloodSacrificeCompetition(competition, sacrifice){
    let name = `bsf ${sacrifice.team.name.substr(0,21)}`;
    await this.setupCompetition(this.getPowerLeagueId(competition), name, sacrifice.team);
  }
  async createContest(competition, house, round, game, contest){
    let name = `Div${competition.split(" ")[1]} R${round} H${house} G${game}`;

    const getTeam = (team) =>({id: team.id, coachId: team.idcoach});
  
    await this.setupCompetition(this.getLeagueId(competition,house),name, getTeam(contest.awayTeam.team), getTeam(contest.homeTeam.team));
  }


  async setupCompetition(leagueId, name){
    const competitionId = await this.createCompetition(leagueId,name);

    if (competitionId === -1) return;
    let teams = Array.prototype.slice.call(arguments, 2);
    
    for(let team of teams)
     await apiService.inviteTeam(competitionId, this.ownerId, Number(team.id), Number(team.coachId));

  }

  async createCompetition(leagueId, name){
    const ownerId = 0; //T said this would work as well, saves me figuring out the owner of each league, cause there's 4 different

    const   
    kickOffEvents = true,
    autovalidateMatch = true,
    aging = false,
    enhancement = false,
    resurrection = false,
    customTeams = true,
    mixedTeams = false,
    experiencedTeam = true;


    let result = await apiService.createCompetition(leagueId,name,ownerId, 2, 0,"RoundRobin","ThreeMinutes","InviteOnly",kickOffEvents, autovalidateMatch, aging, enhancement, resurrection, customTeams, mixedTeams, experiencedTeam);
    if (!result) result = await apiService.createCompetition(leagueId,name,ownerId, 2, 0,"RoundRobin","ThreeMinutes","InviteOnly",kickOffEvents, autovalidateMatch, aging, enhancement, resurrection, customTeams, mixedTeams, experiencedTeam); //try once more

    if(!result) return -1;

    return Number(result.CompetitionData.RowCompetition.Id.Value.replace(/\D/g,""));
  }

  getLeagueId(competition, house){
    const name = `ReBBL Clan - Div ${competition.split(" ")[1]} H#${house < 4 ? "1-3" : "4-5"}`;
    return configurationService.getActiveClanSeason().leagues.find(l => l.name === name).id;
  }

  getPowerLeagueId(competition){
    //87495 - div 1 powers, 87496 - div 2 powers, 87497 - div 3 powers
    return 87494 + Number(competition.replace( /\D/g, ''));
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
        limit:10
      },
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + this.redditAuthToken,
        'User-Agent': 'RebblPlanner Script Scheduling parser',
        'Content-Type':'application/x-www-form-urlencoded'
      }
    };

    const response = await axios(config);

    return response.data.data.children.find(x => x.data.title === `CLAN Season 11 week ${round}`);
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

    return {fullname:response.data.name, permalink:response.data.permalink};
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
    const coach = clan.members.find(m => m.coachId === team.coach.id);
    return `${coach.reddit} [${team.team.name}](https://rebbl.net/team/${team.team.id}) **${this.getRace(team.team.idraces)}**`;
  }

  getRedditAwayMatch(team,clan){
    const coach = clan.members.find(m => m.coachId === team.coach.id);
    return `**${this.getRace(team.team.idraces)}** [${team.team.name}](https://rebbl.net/team/${team.team.id}) ${coach.reddit}`;
  }

  getRace(id){
    return this.races.find(x => x.id === id).name;
  }

  getRedditUsers(draft,homeClan,awayClan){
    return draft.contests.map(contest => `${this.getRedditHomeUser(contest.homeTeam,homeClan)} vs. ${this.getRedditAwayUser(contest.awayTeam,awayClan)} schedule here`);
  }

  getRedditHomeUser(team,clan){
    const coach = clan.members.find(m => m.coachId === team.coach.id);
    return `/u/${coach.reddit}`;
  }

  getRedditAwayUser(team,clan){
    const coach = clan.members.find(m => m.coachId === team.coach.id);
    return `/u/${coach.reddit}`;
  }


}

module.exports = new Draft();
