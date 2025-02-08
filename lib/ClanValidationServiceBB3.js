'use strict';
const 
bb3Service = require('./bb3Service.js'),
  cyanide = require('./CyanideService.js'),
  dataService = require('./DataService.js').rebbl,
  util = require('./util.js');


class ClanValidationService {
  constructor(){
    this.division1 = [];
    this.division2 = [];
    
    this.shortSeason = 'S19';

    this.divisions = [
      {name: 'Division 1',budget:6_500_000, powerBudget: 0},
      {name: 'Division 2a',budget:7_100_000, powerBudget: 150_000},
      {name: 'Division 2b',budget:7_100_000, powerBudget: 150_000},
      {name: 'Division 3a',budget:6_750_000, powerBudget: 0},
      {name: 'Division 3b',budget:6_750_000, powerBudget: 0}
    ];

    /*
    Lizardmen, Orcs, Dwarves, Necromantic, Undead, Dark Elves, Wood Elves, Skaven: 100K
    Chaos Renegades, Humans, Pro Elves, Underworld, Chaos Chosen: 0
    Black Orc, Nurgle, Imperial Nobility, Old World Alliance, Goblin, Halfling: -100k
    */

    this.tierTax = [
      {race:"darkElf", tier:1, cost:100_000},
      {race:"dwarf", tier:1, cost:100_000},
      {race:"lizardman", tier:1, cost:100_000},
      {race:"necromanticHorror", tier:1, cost:100_000},
      {race:"orc", tier:1, cost:100_000},
      {race:"shamblingUndead", tier:1, cost:100_000},
      {race:"skaven", tier:1, cost:100_000},
      {race:"woodElf", tier:1, cost:100_000},

      {race:"chaosChosen", tier:2, cost:0},
      {race:"chaosRenegade", tier:2, cost:0},
      {race:"elvenUnion", tier:2, cost:0},
      {race:"human", tier:2, cost:0},
      {race:"underworldDenizen", tier:1, cost:0},

      {race:"blackOrc", tier:3, cost:-100_000},
      {race:"goblin", tier:3, cost:-100_000},
      {race:"halfling", tier:3, cost:-100_000},
      {race:"imperialNobility", tier:3, cost:-100_000},
      {race:"nurgle", tier:3, cost:-100_000},
      {race:"oldWorldAlliance", tier:3, cost:-100_000},
    ];


    this.powers = [
      {key:'assassination', name:'Assassination', use:2, cost:100_000},
      {key:'badInducementDeal', name:'Bad Inducement Deal', use:2, cost:50_000},
      {key:'confusion', name:'Confusion', use:2, cost:50_000},
      {key:'financialFairPlay', name:'Financial Fair Play', use:2, cost:50_000},
      {key:'hatredOfPublicTransport', name:'Hatred of Public Transport', use:5, cost:20_000},
      {key:'inspiration', name:'Inspiration', use:2, cost:100_000},
      {key:'lastMinuteSwitch', name:'Last Minute Switch', use:1, cost:150_000},
      {key:'miscommunication', name:'Miscommunication', use:1, cost:150_000},
      {key:'stuntyAssassination', name:'Stunty Assassination', use:2, cost:100_000},
      {key:'stuntyBadInducementDeal', name:'Stunty Bad Inducement Deal', use:2, cost:50_000},
      {key:'stuntyConfusion', name:'Stunty Confusion', use:2, cost:50_000},
      {key:'stuntyHatredOfPublicTransport', name:'Stunty Hatred of Public Transport', use:5, cost:20_000},
      {key:'stuntyInspiration', name:'Stunty Inspiration', use:2, cost:100_000},
      {key:'stuntyLastMinuteSwitch', name:'Stunty LastMinuteSwitch', use:1, cost:150_000},
      {key:'stuntyMiscommunication', name:'Stunty Miscommunication', use:1, cost:150_000}
    ];

    this.skills = [];
    this.races = [];
    bb3Service.getAllSkills().then(skills => this.skills = skills);
    bb3Service.getClanRaces().then(races => this.races = races);
  }

  async validate(clanName){
    const clan = await dataService.getClan({name:clanName,season:'season 19'})

    const validationErrors = {};
    try{
      validationErrors.incompleteTeamErrors = await this.checkTeams(clan);
  
      validationErrors.freshTeamErrors = this.checkFreshTeamRules(clan);
  
      validationErrors.clanErrors = this.checkClan(clan);
  
      validationErrors.cheatingErrors = this.checkForCheaters(clan);

      validationErrors.teamErrors = await this.validateTeams(clan);
    }
    catch(ex){
      validationErrors.ex = ex.message;
    }

    return validationErrors;
  }

  checkTeams(clan){
    return clan.ledger.teamBuilding.filter(team => !team.race).map(team => `Can't check ${team.name}, race is missing`);
  }

  checkFreshTeamRules(clan){
    const teams = clan.ledger.teamBuilding.filter(x => !x.isReturningTeam);
    return this.checkFreshTeamBasicRules(teams)
      .filter(x => x != '' && x != null);
  }

  /* fresh team checks */
  checkFreshTeamBasicRules(teams){
    // 1.1 You must take at least 5 Fan Factor (cost is zeroed out for the first 5 Fan Factor in the clan ledger and therefore does not affect the budget of the clan).
    // 1.3 You must have at least 11 players.
    // 1.4 You must have at least 3 rookies with no skill ups.
    return teams
      .map(team => team.roster?.length >= 11 ? '' : team.roster ? `Rule : ${team.name} needs at least 11 players` : '')
      .concat(teams.map(team => this.skillsValid(team)))
      .filter(x => x !== '');
  }

  skillsValid(team){
    if (!team.roster) return [];
    let skills = team.roster.map(x => x.skill1).concat(team.roster.map(x => x.skill2)).filter(x => x?.name.toLowerCase().indexOf("random") === -1);
    
    const occurances = skills.filter(x => x).reduce((p, c) => p.set(c.name, (p.get(c.name) || 0) + 1), new Map());

    for (let entry of occurances.entries()) {
      if (entry[1] < 4) occurances.delete(entry[0]);
    }

    const keys = [...occurances.keys()];
    if (keys?.some(x =>x)) return `Rule : ${team.name} has ${keys.length > 1 ? 'skills' : 'skill'}  ${keys.join(', ')} chosen more than 3 times`;

    return '';
  }


  /* returning team checks */
  checkReturningTeamBasicRules(teams){
    // 1.1 You must take at least 5 Fan Factor (cost is zeroed out for the first 5 Fan Factor in the clan ledger and therefore does not affect the budget of the clan).
    // 1.3 You must have at least 11 players.
    return teams.filter(x => !['Halfling','Goblin'].includes(x.race?.name)).map(team => team.fanfactor >= 5 ? '' : `Rule 1.1: ${team.name}, increase fan factor to at least 5`)
      .concat(teams.map(team => team.roster?.length >= 11 ? '' : team.roster ? `Rule 1.3: ${team.name} needs at least 11 players` : ''))
      .filter(x => x !== '');
  }
  checkReturningTeamBudgetRules(teams){
    // 2.1 Tier 7 teams must have a total cost of at least 900k GP. They are also subject to rule 7.5 and 7.6 for new teams (grats!).
    // 2.2 All other teams must cost at least 1.2 million GP. Note that this is actual cost, and is not affected by tier tax or refund.     
    const messages = [];
    for(let team of teams){
      const tier = this.tierTax.find(x => x.race === team.race?.name)?.tier;
      switch (tier){
        case 7:
          if(this.teamCost(team) < 900_000) messages.push(`Rule 1.2: ${team.name} must cost at least 900 thousand GP. This is the actual cost, and is not affected by tier tax or refund.`);
          break;
        default:
          if(this.teamCost(team) < 1_200_000) messages.push(`Rule 2.2: ${team.name} must cost at least 1.2 million GP. This is the actual cost, and is not affected by tier tax or refund.`);
          break;
      }
    }
    return messages;
  }
  checkReturningTeamPlayerRules(teams){
    // 3.1 Players maintain permanent injuries, but MNG’s are removed between seasons.
    // 3.2 You do not have to buy ALL of your previous players, but any new players must be rookie players with no SPP.  
    // 3.3 Any players from your previous team that are not re-hired in this manner are lost forever (beer and off-season brawling take their toll on all BB teams)!  
    // 3.4 Player names may be changed compared to the previous team, but please keep them in the same order as you had them last season so it is easier for us to validate that teams are correctly transferred.
    // 3.5 Team name may be changed between seasons, but you must indicate last season’s team name on the ledger so we know what to validate your new team against.
    // 3.6 If you are passing ownership of this team to a clan mate, they may change the player and team names, but MUST contact their divisional admin before doing so. If you have a level up pending at the end of the season you must roll this in client and apply it to your old team before beginning the rebuy process.
    const messages = [];
    for(let team of teams){
      for(let player of team.roster?.filter(p => p.id === 0)){
        if (player.skill1 || player.skill2) messages.push(`Rule 3.2: ${team.name}, any new players must be rookie players with no SPP.`);
      }
      for(let player of team.roster?.filter(p => p.id !== 0)){
        if (player.skill1 && !player.dice) messages.push(`Rule 4: ${team.name}, player ${player.name} has a skill but no diceroll is made, that is not possbile.`);
        if (player.skill2) messages.push(`Rule 4: ${team.name}, player ${player.name} has a 2nd skill, that is not possbile.`);
      }

    }
    return [...new Set(messages)];    
  }

  /* clan checks */
  checkClan = (clan) => {
    // 7.5 million Gold Pieces cash budget for div 1 clans, and an additional 300k for clan powers 
    // 7.1 million Gold Pieces cash budget for div 2 clans, and an additional 150k for clan powers
    // 6.75 million Gold Pieces cash budget for div 3 clans, but no extra money for clan powers
    let messages = [];

    const teamTotalCost = clan.ledger.teamBuilding.reduce((p,c) => {
      let cost = this.teamCost(c);
      let tierTax = this.tierTax.find(x => x.race === c.race?.name)?.cost;
      return p + cost + tierTax;
    },0);

    if (teamTotalCost > 6_500_000) messages.push(`Your clan is overspending, your budget is 6.5 million GP.`);

    clan.members.forEach(coach => {
      if (coach.coach.length > 0 &&  coach.reddit.length === 0) 
        messages.push(`No account found for coach ${coach.coach}.`);
      else if (coach.coach.length == 0) 
        messages.push(`Your clan is missing a coach.`);
    });


    return messages.filter(x => x !== '');
  }

  checkForCheaters(clan){
    const messages = [];
    for(let team of clan.ledger.teamBuilding){
      const race = this.races.find(x => x.id === team.race?.id);
      for(let player of team.roster||[]){
        const playerSkills = race.positions.find(x => x.data === player.playerType.data).skills;
        if (playerSkills.length < player.fixedSkills.length && player.skills.length === player.fixedSkills.length) messages.push(`${team.name}, ${player.name} has tried to cheat the system but got caught.`);
        for(let skill of player.fixedSkills){
          if (!playerSkills.includes(skill)) messages.push(`${team.name}, ${player.name} has tried to cheat the system but got caught, tried to stuff ${skill} in fixed Skills`);
        }
      }
    }
    return messages;
  }

  /* validate bb2 teams */
  async validateTeams(clan){
    const errors = [];

    const messages = await Promise.all(clan.ledger.teamBuilding.map(team => this.compareTeams(clan.name, team, team.name)));

    for(let index in clan.ledger.teamBuilding){
      let data = messages[index];
      if (data.length > 0) errors.push({team:clan.ledger.teamBuilding[index].name || `team at position ${clan.ledger.teamBuilding[index].id }` ,messages: data});
    }
    return errors;



    for(let ledgerTeam of clan.ledger.teamBuilding){
      let messages = await this.compareTeams(clan.name, ledgerTeam, ledgerTeam.name);
      if (messages.length > 0) errors.push({team:ledgerTeam.name || `team at position ${ledgerTeam.id }` ,messages});
    }
    return errors;
  }
  

  async compareTeams (clanName, ledgerTeam, cyanideTeamName ){
    const casualties = ['DamagedBack','SmashedKnee','SmashedAnkle','SmashedHip','SmashedCollarBone','BrokenNeck','FracturedSkull','SeriousConcussion'];
    const messages = [];
    const test = new RegExp(`^\\[${clanName}].*${this.shortSeason}$`);
    if (!test.test(ledgerTeam.name)) {
      messages.push(`The team name ${ledgerTeam.name} does not match the format [${clanName}] name ${this.shortSeason}`);
      return messages;
    }
    let cyanideTeam = await cyanide.team({name:cyanideTeamName, bb:3});
    if (!cyanideTeam || !cyanideTeam.team || cyanideTeam.team.name !== cyanideTeamName) {
      messages.push(`Could not find team ${cyanideTeamName} in BB3`);
      return messages;
    }
    if (cyanideTeam.team.cash > 0) messages.push(`Needs to dump ${cyanideTeam.team.cash} before their first game (buy & fire players, not rerolls/coaches/cheerleaeders)`);
    
    if (Number(cyanideTeam.team.rerolls) !== Number(ledgerTeam.rerolls)) messages.push(`Number of rerolls don't match (${cyanideTeam.team.rerolls} vs ${ledgerTeam.rerolls})`);
    if (Number(cyanideTeam.team.popularity) !== Number(ledgerTeam.fanfactor)) messages.push(`The dedicated fans do not match (${cyanideTeam.team.popularity} vs ${ledgerTeam.fanfactor})`);
    if (Number(cyanideTeam.team.cheerleaders) !== Number(ledgerTeam.cheerleaders)) messages.push(`Number of cheerleaders don't match (${cyanideTeam.team.cheerleaders} vs ${ledgerTeam.cheerleaders})`);
    if (Number(cyanideTeam.team.assistantcoaches) !== Number(ledgerTeam.coaches)) messages.push(`Number of assistantcoaches don't match (${cyanideTeam.team.assistantcoaches} vs ${ledgerTeam.coaches})`);
    if (ledgerTeam.apothecary !== (cyanideTeam.team.apothecary == 1 ? true : false) ) messages.push(`Apothecary doesn't match`);

    const race = this.races.find(x => x.id === ledgerTeam.race?.id);
    for(let player of ledgerTeam.roster||[]){
      const createdPlayer = cyanideTeam.roster?.find(p => p.name+"" === player.name+"");
      if (!createdPlayer) {
        messages.push(`Could not find player ${player.name} on the BB3 team`);
        continue;
      }
      if (createdPlayer.type !== player.playerType.data) messages.push(`Player ${createdPlayer.name} (${player.playerType.data}) does not match the position defined on the ledger (${createdPlayer.type})`);
      const playerSkills = race.positions.find(x => x.data === player.playerType.data).skills;

      let skills = [...playerSkills];
      if (player.selectedSkill1) skills.push(player.selectedSkill1);
      if (player.selectedSkill2) skills.push(player.selectedSkill2);

      for (let skill of skills){
        if (skill.indexOf("random") > -1) continue;
        if (!createdPlayer.skills.includes(skill) && !playerSkills.includes(skill)) messages.push(`${player.name} is missing skill ${skill}`);
      }
      for(let skill of createdPlayer.skills){
        if (!skills.includes(skill)) messages.push(`${player.name} has skill ${skill} too many`);
      }
      if (player?.id > 0){
        const player12 = await dataService.getPlayer({id:player.id});
        
        for(let skill of player12.skills){
          if (!createdPlayer.skills.map(skill => skill.replace(/ /g, '').trim()).includes(skill) && !playerSkills.includes(skill)) messages.push(`Returning player ${player.name} is missing skill ${skill}`);  
          //
        }
        
        if (player12.casualties_state?.length == 0 && player12.casualties_state?.length < player12.casualties_sustained_total?.length) player12.casualties_state = player12.casualties_sustained_total;

        player12.casualties_state = player12.casualties_state.filter(x => casualties.includes(x));

        if (player12.casualties_state.length !== player.casualties.length) messages.push(`Returning player ${player.name} number of casualties doesn't match S14 version`);

        const toCheck = player.casualties?.filter(x => !x.removed).map(x => x.name);
        if (toCheck.length !== createdPlayer.casualties_state.length) messages.push(`Returning player ${player.name} number of casualties doesn't match ledger version`); 
        for(let casualty of toCheck){
          if(!createdPlayer.casualties_state.includes(casualty)) messages.push(`Returning player ${player.name} is missing ${casualty.replace(/([A-Z])/g, ' $1').trim()}`); 
        }
        
      }
    }
    for(let player of cyanideTeam.roster||[]){
      const ledgerPlayer = ledgerTeam.roster.find(p => p.name +"" === player.name +"");
      if (!ledgerPlayer) {
        messages.push(`Player ${player.name} can not be found on the ledger`);
        continue;
      }
    }
    return messages;

  }

  async validateNewBlood(clanName,teamPosition, newTeam){

    let clan = await dataService.getClan({name:clanName, active:true});
    if (clan.powers.newBlood < 1) return ["No more new blood left"];

    let team = await dataService.getTeam({"team.id":clan.ledger.teams[teamPosition-1].team.id});
    if (!team) return ["Current team not found"];

    const now = Date.now();
    let teamMatches = await cyanide.teammatches({team:clan.ledger.teams[teamPosition-1].team.id});
    let lastMatchDate = util.getDateFromUUID(teamMatches.matches[0].id);
    
    const offsets = [-6,0,-1,-2,-3,-4,-5];

    let startOfRound = lastMatchDate;
    startOfRound.setDate(startOfRound.getDate() + offsets[lastMatchDate.getDay()]);

    const week = util.getISOWeek(startOfRound);
    if (week % 2 === 1) startOfRound.setDate(startOfRound.getDate() - 7); // change according to if round 1 starts on even or uneven week

    const endOfRound = startOfRound;
    endOfRound.setDate(endOfRound.getDate() + 14);
    endOfRound.setUTCHours(23,59,59);

    
    if (endOfRound < now) return [`The deadline has passed, last match played: ${team.team.datelastmatch}, round ended ${endOfRound}`];

    const originalTeam = clan.ledger.teamBuilding.find(x => x.name === team.team.name);
    originalTeam.value = originalTeam.roster.reduce((p,c) => p + this.playerCost(c),0) + originalTeam.rerolls * this.rerollCost(originalTeam) + (Number(originalTeam.cheerleaders) + Number(originalTeam.coaches) + Number(originalTeam.fanfactor)) * 10000 + (originalTeam.apothecary ? 50000 : 0);
    if (originalTeam.value < 1_100_000) return [`The team ${originalTeam.name} is not valid for New Blood, its team value (${originalTeam.value}) is too low`];

   
    newTeam.hasLegacyPlayer = newTeam.roster.some(x => this.isLegacy(x));

    /* Check for draft */
    
    /* New Blood rules */

    /*
    If the new team is the same race as the original team, a single player from the original team may be kept as a legacy player (retaining skills and injuries). 
    A legacy player costs the same in gold as he is listed as valued in-game using the separate row at the top of the New Blood tab. 
    This legacy player counts towards the number of superstars on the new team (as the team’s first superstar, although his 10k superstar tax is considered part of the price paid for him already). 
    A second superstar (beyond the legacy player) would cost 20k tax, a third 30k, etc, as per the rules on superstars. 
    The legacy player also counts towards the number of statistic increased players AND number of doubles players (if the legacy player has any stats or doubles). 
    Such players would still be legal even if they have more statistic and/or doubles than a fresh team superstar is allowed to buy, as they earned those stats and doubles the hard way! For instance: 

    A legacy +ST and +AG dorf runner with dodge and sidestep would thus consume both the statistic and double quota of the new blood:ed Dorf team. 
    A legacy +MV and +AG war dancer would count as having consumed the statistic quota, for the new blood:ed Wood Elf team, but one double could still be used on another player. 
    A legacy Mighty Blow and Piling On blitzer would consume two of the three doubles that a High Elf team could have. As they can take either 1 statistic and 1 double, or 3 doubles, this also means that a double is the only feasible option left for them to take on another player.
    A legacy Block mummy would consume one double, and allow the Undead team to either take two more doubles on other players, or one statistic. 
    You cannot switch tiers upwards when using this power, if you move downwards a tier you DO NOT receive any tax rebate associated with that tier. You cannot use this power on a team that started the season under 1100 TV.
    */
    
    let messages = [];
    
    //1:  replacing it with a new team costing the same in gold as the original team did at the start of the season, this is Total Cost, including Tax Rebates
    const teamCost = this.teamCost(originalTeam) + this.tierTax.find(x => x.race === originalTeam.race?.name)?.cost;
    const newTeamCost = this.teamCost(newTeam) + this.tierTax.find(x => x.race === newTeam.race?.name)?.cost;;

    if (newTeamCost > teamCost) messages.push(`The new team costs (${newTeamCost}GP) more than the team it replaces (${teamCost}GP)`);

    //2: Can't go up in Tier
    const originalTier = this.tierTax.find(x => x.race === originalTeam.race.name);
    const newTier =  this.tierTax.find(x => x.race === newTeam.race.name);

    if (newTier.tier < originalTier.tier) messages.push(`You can't choose a higher tier for the new team`);

    messages = messages.concat(
       this.checkFreshTeamBasicRules([newTeam])
      //.concat(this.checkFreshTeamTierRules([newTeam]))
      .filter(x => x != '' && x != null)
    );



    /* Check team against API */
    messages =  messages.concat(await this.compareTeams (clanName, newTeam, newTeam.name));
    return messages;
  }



  // --- checks
  isPlayerCorrectSuperstar = (player) => 
    player.playerType.normal.includes(this.skillDescriptions.find(x => x.name === player.skill1)?.category) && 
    player.playerType.normal.includes(this.skillDescriptions.find(x => x.name === player.skill2)?.category);

  isDoubleSkill = (player, skill) => player.playerType?.doubles.includes(this.skillDescriptions.find(x => x.name === skill)?.category ||'');
  isStatsIncrease = (skill) => this.skillDescriptions.filter(x => x.category == 'Increase').map(x => x.name).includes(skill);


  // --- cost
  getSkillCost = (player) => {
      /*
                      random primary  select primary/random secondary   select secondary    characteristic
        Experienced         3                     6                           12                  18
        Veteran-            4                     8                           14                  20
        Emerging Star       6                    10                           16                  24
        Star                8                    12                           18                  28
        Super Star         10                    14                           20                  32
        Legend             15                    30                           40                  50      
      */
        
        const secondaryXP = [0,12,14,16,18,20,40];
        const primaryXP   = [0, 6, 8,10,12,14,30];
        const randomSecondaryXP  = primaryXP;
        const randomPrimaryXP    = [ 0, 3, 4, 6, 8,10,15];
        const characteristic     = [ 0,18,20,24,28,32,50];

        let level = player.skills.length;
        let secondary = this.skills.filter(x => player.playerType.affinities.secondary.indexOf(x.category)>-1).map(x => {return {name: x.data, secondary:true}}); 
        let primary = this.skills.filter(x => player.playerType.affinities.primary.indexOf(x.category)>-1).map(x => {return {name: x.data, secondary:false}}); 

        let isSecondary = secondary.some(x => x.name == player.selectedSkill1);
        let isPrimary = primary.some(x => x.name == player.selectedSkill1);

        if (player.selectedSkill1 && !isPrimary && !isSecondary){ 
          isSecondary = player.selectedSkill1?.indexOf("secondary") > -1;
          isPrimary = !isSecondary;
        }

        let isRandom = player.selectedSkill1?.indexOf("random") > -1;
        let isCharacteristic = player.selectedSkill1?.indexOf("characteristic") > -1;

        let skillCost = 0;

        if (isCharacteristic) skillCost = characteristic[++level];
        else if (isSecondary) skillCost = (isRandom ? randomSecondaryXP : secondaryXP)[++level];
        else if (isPrimary)   skillCost = (isRandom ? randomPrimaryXP: primaryXP)[++level];

        isSecondary = secondary.some(x => x.name == player.selectedSkill2);
        isPrimary = primary.some(x => x.name == player.selectedSkill2);

        if (player.selectedSkill2 && !isPrimary && !isSecondary){ 
          isSecondary = player.selectedSkill2?.indexOf("secondary") > -1;
          isPrimary = !isSecondary;
        }

        isRandom = player.selectedSkill2?.indexOf("random") > -1;
        isCharacteristic = player.selectedSkill2?.indexOf("characteristic") > -1;

        if (isCharacteristic) skillCost += characteristic[++level];
        else if (isSecondary) skillCost += (isRandom ? randomSecondaryXP : secondaryXP)[++level];
        else if (isPrimary)   skillCost += (isRandom ? randomPrimaryXP: primaryXP)[++level];

        return skillCost * 5_000  ;
    }
  
  medicalBill = (player) => player.casualties.reduce((p,c) => p += c.removed ? 1 : 0 ,0) * 100_000;
  playerCost(player) {
    if (player.id && player.id > 0){
      return player.value * 1000 + this.medicalBill(player) + this.getSkillCost(player);
    }

    const cost = player.playerType.cost + this.getSkillCost(player)
    return cost;
  }
  
  rosterCost = (team) => team.roster?.reduce((p,c) => p + this.playerCost(c) ,0);
  rerollCost = (team) => team.race ? team.race.reroll || 50_000 : 50000;
  subTotalRerolls = (team) => team.rerolls * this.rerollCost(team) + (Number(team.cheerleaders) + Number(team.coaches) + (team.fanfactor-1)) * 10_000 + (team.apothecary ? 50_000 : 0);
  
  isLegacy = (player) => player.id > 0;

  teamCost = (team) => {
    let cost = this.rosterCost(team) + this.subTotalRerolls(team);
    if (Number.isNaN(cost)) cost = 0;

    return Math.max(cost,1_100_000);
  } 

  powersTotal = (ledger) =>{
    const powers = ['miscommunication', 'badInducementDeal', 'lastMinuteSwitch', 'assassination', 'inspiration', 'confusion', 'hatredOfPublicTransport', 'financialFairPlay'];
    let cost = 0;
    for(const key of powers){
      cost += this.powers.find(x => x.key === key).cost * ledger[key];
    }
    return cost;
  }

  powersCheck = (ledger) =>{
    const powers = ['miscommunication', 'badInducementDeal', 'lastMinuteSwitch', 'assassination', 'inspiration', 'confusion', 'hatredOfPublicTransport', 'financialFairPlay'];
    const messages = [];
    for(const key of powers){
      const power = this.powers.find(x => x.key === key);
      if (power.use < ledger[key]) messages.push(`You can't have more than ${power.use} ${power.name}.`)
    }
    return messages;
  }

  stuntyTotal = (ledger) => {
    const powers = ['stuntyMiscommunication', 'stuntyLastMinuteSwitch', 'stuntyAssassination', 'stuntyInspiration', 'stuntyBadInducementDeal', 'stuntyConfusion', 'stuntyHatredOfPublicTransport'];

    let cost = 0;
    for(const key of powers){
      cost += this.powers.find(x => x.key === key).cost * ledger[key];
    }
    return cost;
  }  

  stuntyCheck = (ledger) =>{
    const powers = ['stuntyMiscommunication', 'stuntyLastMinuteSwitch', 'stuntyAssassination', 'stuntyInspiration', 'stuntyBadInducementDeal', 'stuntyConfusion', 'stuntyHatredOfPublicTransport'];
    const messages = [];
    for(const key of powers){
      const power = this.powers.find(x => x.key === key);
      if (power.use < ledger[key]) messages.push(`You can't have more than ${power.use} ${power.name}.`)
    }
    return messages;
  }



}

module.exports = new  ClanValidationService();