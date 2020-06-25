"use strict";
const accountService = require("./accountService.js")
, apiService = require("./apiService.js")
, clanService = require("./ClanService.js")
, configurationService = require("./ConfigurationService.js")
, dataService = require("./DataService.js").rebbl;

class Draft {
  constructor(){
    this.races = [];
  }

  async getDraft(userName, division, round, house){
    const account = await accountService.getAccount(userName);
    const clan = await clanService.getClanByUser(account.coach); 
    const leader = await accountService.hasRole(userName, "clanleader");
    let schedule;
    if (division && round && house){
      schedule = await dataService.getSchedule({season:/season 9/i,league:"clan",competition:division, round:Number(round), house: Number(house)});  
    }
    else{
      if (!clan) return;
      schedule = await dataService.getSchedule({season:/season 9/i,drafted:false,league:"clan",$or:[{"home.clan":clan.name},{"away.clan":clan.name}]},{sort:{round:1},limit:1});      
    }

    let clans = await dataService.getClans({active:true,name:{$in:[schedule.home.clan,schedule.away.clan]}});

    schedule.home.clan = clans.find(c => c.name === schedule.home.clan);
    schedule.away.clan = clans.find(c => c.name === schedule.away.clan);

    let teams = await dataService.getTeams({"team.id":{$in:schedule.home.clan.ledger.teams.map(team=> team.team.id).concat(schedule.away.clan.ledger.teams.map(team=> team.team.id))}});

    const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: "base"});
    for(var x = 0; x <5; x++){
      schedule.home.clan.teams[x] = teams.find(t => collator.compare(t.team.name,schedule.home.clan.teams[x]) === 0 );
      schedule.away.clan.teams[x] = teams.find(t => collator.compare(t.team.name,schedule.away.clan.teams[x]) === 0);
    }

    const draft = await dataService.getDraft({competition:schedule.competition, round:schedule.round, house: schedule.house});
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

    let savedDraft = await dataService.getDraft({competition:draft.competition, round:draft.round, house: draft.house});
    if (savedDraft && savedDraft.confirmed) throw new Error("This draft is already confirmed!");

    const account = await accountService.getAccount(userName);    
    let clan = await clanService.getClanByUser(account.coach); 
    const schedule = await dataService.getSchedule(query);

    if (!clan || clan.name !== schedule.home.clan && clan.name !== schedule.away.clan)
      throw new Error("You are not the clan leader for either clan!");

    let confirmByClan = "";
    
    if (clan.name === schedule.home.clan) confirmByClan = schedule.away.clan;
    else confirmByClan = schedule.home.clan;

    clan = await dataService.getClan({name:confirmByClan, season:"season 9"});

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

    const account = await accountService.getAccount(userName);    
    if (draft.confirmationBy !== account.coach){
      throw new Error(`Only coach ${draft.confirmationBy} can confirm this draft.`);
    }

    //Set draft to confirmed, so parallel requests have less of chance to wreck havock
    dataService.updateDraft(query, {$set:{confirmed:true}});

    // Draft powers that require a match
    draft.powers.home.assassination.map(x => this.createAssassinationCompetition(draft.competition, x));
    draft.powers.away.assassination.map(x => this.createAssassinationCompetition(draft.competition, x));

    draft.powers.home.emergencyRnR.map(x => this.createEmergencyRnRCompetition(draft.competition, x));
    draft.powers.away.emergencyRnR.map(x => this.createEmergencyRnRCompetition(draft.competition, x));

    draft.powers.home.inspiration.map(x => this.createInspirationCompetition(draft.competition, x));
    draft.powers.away.inspiration.map(x => this.createInspirationCompetition(draft.competition, x));

    draft.powers.home.bloodSacrifice.map(x => this.createBloodSacrificeCompetition(draft.competition, x));
    draft.powers.away.bloodSacrifice.map(x => this.createBloodSacrificeCompetition(draft.competition, x));

    for(const [index, contest] of draft.contests.entries()) {
     await this.createContest(draft.competition, draft.house, draft.round, index+1, contest);
    }

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

    const unstarted = competitionsInformation.map(x => {
      return {
        competitionId : Number(x.Row.Id.Value.replace(/\D/g,"")),
        competitionName: x.Row.Name,
        coaches: x.participants.map(mapCompetitionInformation).concat(x.tickets.map(mapCompetitionInformation))
      };
    });

    dataService.updateSchedule(query, {$set:{unstarted: unstarted, drafted:true}});

    //this.postToReddit(draft);
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

    let teams = Array.prototype.slice.call(arguments, 2);
    
    for(let team of teams)
     await apiService.inviteTeam(competitionId, this.ownerId, Number(team.id), Number(team.coachId));

  }

  async createCompetition(leagueId, name){
    const ownerId = 0; //T said this would work as well, saves me figuring out the owner of each league, cause there's 4 different
    const result = await apiService.createCompetition(leagueId,name,ownerId, 2, 0,"RoundRobin","ThreeMinutes","InviteOnly",true,true,false,true,false,true,false,true);

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


/*
  async postToReddit(draft){
    if(this.races.length === 0) this.races = await dataService.getRaces();

    const query = {
      house: draft.house,
      round: draft.round,
      competition: draft.competition,
      season: draft.season
    };

    const schedule = await dataService.getSchedule(query);

    const homeClan = await dataService.getClan({name:schedule.home.clan});
    const awayClan = await dataService.getClan({name:schedule.away.clan});

    return `# ${homeClan.name} v ${awayClan.name}
### Pre-draft powers
${homeClan.name}: ${this.getPreDraftPowers(draft.powers.home)}    
${awayClan.name}: ${this.getPreDraftPowers(draft.powers.away)}

${this.getRedditMatches(draft,homeClan,awayClan)}    

### Post-draft powers
${homeClan.name}: ${this.getPostDraftPowers(draft.powers.home)}    
${awayClan.name}: ${this.getPostDraftPowers(draft.powers.away)}`;
  }

  getPreDraftPowers(draftPowers){
    const powers = ['emergencyRnR','badInducementDeal','inspiration'];
    let usedPowers = [];
    powers.map(p => Array.isArray(draftPowers[p]) ? usedPowers.concat(Array(draftPowers[p].length).fill(p)) : usedPowers.concat(Array(draftPowers[p]).fill(p)) );
    return usedPowers.join(',');
  }
  getPostDraftPowers(draftPowers){
    const powers = ['bloodSacrifice','assassination','miscommunication','lastMinuteSwitch'];
    let usedPowers = [];
    powers.map(p => Array.isArray(draftPowers[p]) ? usedPowers.concat(Array(draftPowers[p].length).fill(p)) : usedPowers.concat(Array(draftPowers[p]).fill(p)) );
    return usedPowers.join(',');
  }

  getRedditMatches(draft,homeClan,awayClan){

    return draft.contests.map((contest,index) => this.getRedditMatch(index,contest,homeClan,awayClan));

  }

  getRedditMatch(index,contest,homeClan,awayClan){
    return `Match ${index}: ${this.getRedditHomeMatch(contest.homeTeam,homeClan)} vs. ${this.getRedditAwayMatch(contest.awayTeam,awayClan)}    \r\n`;
  }

  getRedditHomeMatch(team,clan){
    const coach = clan.members.find(m => m.coachId === team.coach.id);
    return `${coach.reddit} [${team.team.name}](https://rebbl.net/clan/team/${team.team.id}) **${this.getRace(team.team.idraces)}**`;
  }

  getRedditAwayMatch(team,clan){
    const coach = clan.members.find(m => m.coachId === team.coach.id);
    return `**${this.getRace(team.team.idraces)}** [${team.team.name}](https://rebbl.net/clan/team/${team.team.id}) ${coach.reddit}`;
  }

  getRace(id){
    return this.races.find(x => x.id === id).name;
  }
*/
}

module.exports = new Draft();
