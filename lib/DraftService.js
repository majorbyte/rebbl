"use strict";
const accountService = require("./accountService.js")
, apiService = require("./apiService.js")
, clanService = require("./ClanService.js")
, configurationService = require("./ConfigurationService.js")
, dataService = require("./DataService.js").rebbl;

class Draft {
  constructor(){

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
    const account = await accountService.getAccount(userName);    

    if (draft.confirmationBy !== account.coach){
      throw new Error(`Only coach ${draft.confirmationBy} can confirm this draft.`);
    }

    // Draft powers that require a match
    //Emergency R&R
    //Blood Sacrifice
    //Inspiration
    //Assassination
    
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
   

    dataService.updateDraft(query, {$set:{confirmed:true}});

    this.postToReddit(draft);
  }

  async createAssassinationCompetition(competition, assassination){
    let name = `asn ${assassination.player.name.substr(0,21)}`;
    this.setupCompetition(this.getPowerLeagueId(competition), name, assassination.team);
  }
  async createEmergencyRnRCompetition(competition, emergency){
    let name = `rnr ${emergency.team.name.substr(0,21)}`;
    this.setupCompetition(this.getPowerLeagueId(competition), name, emergency.team);
  }
  async createInspirationCompetition(competition, inspiration){
    let name = `ins ${inspiration.player.name.substr(0,21)}`;
    this.setupCompetition(this.getPowerLeagueId(competition), name, inspiration.team);
  }
  async createBloodSacrificeCompetition(competition, sacrifice){
    let name = `bsf ${sacrifice.team.name.substr(0,21)}`;
    this.setupCompetition(this.getPowerLeagueId(competition), name, sacrifice.team);
  }
  async createContest(competition, house, round, game, contest){
    let name = `Div${competition.split(" ")[1]} R${round} H${house} G${game}`;

    const getTeam = (team) =>({id: team.id, coachId: team.idcoach});
  
    await this.setupCompetition(this.getLeagueId(competition,house),name, getTeam(contest.awayTeam.team), getTeam(contest.homeTeam.team));
  }


  async setupCompetition(leagueId, name){
    const competitionId = await this.createCompetition(leagueId,name);

      let teams = Array.prototype.slice.call(arguments, 2);
      
      teams.map(async team => await apiService.inviteTeam(competitionId, this.ownerId, Number(team.id), Number(team.coachId)));
  }

  async createCompetition(leagueId, name){
    const ownerId = 0; //T said this would work as well, saves me figuring out the owner of each league, cause there's 4 different
    const result = await apiService.createCompetition(leagueId,name,ownerId, 2, 0,"RoundRobin","FourMinutes","InviteOnly",true,true,false,true,false,true,false,true);

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
    /*
      [CLAN A] v [CLAN B]
      Pre-draft powers
      [CLAN A]:
      [CLAN B]:
      Match 1: <Coach A Reddit tag> <race> vs. <Coach B Reddit tag> <race>.
      Match 2: <Coach C Reddit tag> <race> vs. <Coach D Reddit tag> <race>.
      Match 3: <Coach E Reddit tag> <race> vs. <Coach F Reddit tag> <race>.
      Match 4: <Coach G Reddit tag> <race> vs. <Coach H Reddit tag> <race>.
      Match 5: <Coach I Reddit tag> <race> vs. <Coach J Reddit tag> <race>.
      Post-draft powers
      [CLAN A]:
      [CLAN B]:
    */
    


  }

}

module.exports = new Draft();
