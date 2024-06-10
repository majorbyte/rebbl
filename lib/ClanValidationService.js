'use strict';
const 
  bloodBowlService = require('./bloodbowlService.js'),
  cyanide = require('./CyanideService.js'),
  dataService = require('./DataService.js').rebbl,
  util = require('./util.js');


class ClanValidationService {
  constructor(){
    this.division1 = ['DVLA','BEER','FABBL','FIST','DREDD','RISE','HUGE','GOON','BOSNA','RAVE','ANZAC'];
    this.division2 = [];
    
    this.shortSeason = 'S18';

    this.divisions = [
      {name: 'Division 1',budget:7_500_000, powerBudget: 300_000},
      {name: 'Division 2a',budget:7_100_000, powerBudget: 150_000},
      {name: 'Division 2b',budget:7_100_000, powerBudget: 150_000},
      {name: 'Division 3a',budget:6_750_000, powerBudget: 0},
      {name: 'Division 3b',budget:6_750_000, powerBudget: 0}
    ];

    this.spp = [
      {level:1,	spp:0, eligible:3},
      {level:2,	spp:6, eligible:11},
      {level:3,	spp:16, eligible:23},
      {level:4,	spp:31, eligible:41},
      {level:5,	spp:51, eligible:63},
      {level:6,	spp:76, eligible:126},
      {level:7,	spp:176, eligible:999}
    ];

    this.tierTax = [
      {race:'Lizardman', tier:	1, cost: 150_000},
      {race:'Necromantic', tier:	1, cost: 150_000},
      {race:'Dwarf', tier:	1, cost: 150_000},
      {race:'Chaos Dwarf', tier:	1, cost: 150_000},
      {race:'Orc', tier:	1, cost: 150_000},

      {race:'Khemri', tier:	2, cost: 100_000},
      {race:'Nurgle', tier:	2, cost: 100_000},
      {race:'Undead', tier:	2, cost: 100_000},

      {race:'Amazon', tier:	3, cost: 50_000},
      {race:'Chaos', tier:	3, cost: 50_000},
      {race:'Skaven', tier:	3, cost: 50_000},
      
      {race:'Dark Elf', tier:	4, cost: 0},
      {race:'Norse', tier:	4, cost: 0},
      {race:'Wood Elf', tier:	4, cost: 0},

      {race:'Bretonnian', tier:	5, cost: -50_000},
      {race:'Elven Union', tier:	5, cost: -50_000},
      {race:'High Elf', tier:	5, cost: -50_000},
      {race:'Human', tier:	5, cost: -50_000},

      {race:'Kislev', tier:	6, cost: -100_000},
      {race:'Ogre', tier:	6, cost: -100_000},
      {race:'Underworld Denizens', tier:	6, cost: -100_000},
      {race:'Vampire', tier:	6, cost: -100_000},

      {race:'Goblin', tier:	7, cost: 0},
      {race:'Halfling', tier:	7, cost: 0},
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

    dataService.getRaces({}).then(races => this.races = races);
    dataService.getPlayerTypes({}).then(playerTypes => this.playerTypes = playerTypes);

    bloodBowlService.getAllSkills().then(skills => this.skills = skills);
    bloodBowlService.getSkillDescriptions().then(skillDescriptions => this.skillDescriptions = skillDescriptions.concat([{name:'Increase Strength',category:'Increase'},{name:'Increase Movement',category:'Increase'},{name:'Increase Agility',category:'Increase'},{name:'Increase Armour',category:'Increase'}]));
  }

  async validate(clanName){
    const clan = await dataService.getClan({name:clanName,season:'season 18'})

    const validationErrors = {};
    try{
      validationErrors.sppTradeErrors = await this.checkSppTrades(clan);
      validationErrors.sppTradeSkillErrors = await this.checkSppTradeSkills(clan);
      validationErrors.sppTradeAccounting = this.checkSppTradeSurplus(clan);
  
      validationErrors.incompleteTeamErrors = await this.checkTeams(clan);
  
      validationErrors.freshTeamErrors = this.checkFreshTeamRules(clan);
  
      validationErrors.returningTeamErros = await this.checkReturningTeamRules(clan);
      validationErrors.clanErrors = this.checkClan(clan);
  
      validationErrors.cheatingErrors = this.checkForCheaters(clan);

      validationErrors.teamErrors = await this.validateTeams(clan);
    }
    catch(ex){
      validationErrors.ex = ex.message;
    }

    return validationErrors;
  }

  async checkSppTrades(clan){
    const players = await dataService.getPlayers({'diceRoll.clan':clan.name, 'diceRoll.season':clan.season});

    const messages = players.map(player => clan.ledger.teamBuilding.some(team => team?.roster?.find(x => x.id === player.id)) ? '' : `player ${player.name} has a diceroll, but is not used.`);
    return messages.filter(x => x !== '');
  }
  async checkSppTradeSkills(clan){
    const players = await dataService.getPlayers({'diceRoll.clan':clan.name, 'diceRoll.season':clan.season});

    const messages = players.map(player => clan.ledger.teamBuilding.some(team => team.roster?.find(x => x.id === player.id)?.skill1) ? '' : `player ${player.name} has a diceroll, but no skill is chosen.`)
    for(let oldPlayer of players){
      const team = clan.ledger.teamBuilding.find(team => team.roster?.some(player => player.id === oldPlayer.id));
      if (!team) continue;
      let player = team.roster?.find(player => player.id === oldPlayer.id);
      let result = oldPlayer.diceRoll.dice[0]+oldPlayer.diceRoll.dice[1];
      if (player.skill2) messages.push(`${team.name}, player ${player.name} has a 2nd skill, that is not possbile.`);
      else if (this.isDoubleSkill(player, player.skill1) && oldPlayer.diceRoll.dice[0] !== oldPlayer.diceRoll.dice[1]) messages.push(`${team.name}, player ${player.name} choose a double skill, but dice are ${oldPlayer.diceRoll.dice[0]} + ${oldPlayer.diceRoll.dice[1]}`);
      else if (this.isStatsIncrease(player, player.skill1)){
        
        switch(player.skill1){
          case "Increase Armour":
          case "Increase Movement":
            if (result !== 10) messages.push(`${team.name}, player ${player.name} has ${player.skill1} but the dice are ${player.diceRoll.dice[0]} + ${player.diceRoll.dice[1]}` );
            break;
          case "Increase Agility":
            if (result !== 11) messages.push(`${team.name}, player ${player.name} has ${player.skill1} but the dice are ${player.diceRoll.dice[0]} + ${player.diceRoll.dice[1]}` );
            break;
          case "Increase Strength":
            if (result !== 12) messages.push(`${team.name}, player ${player.name} has ${player.skill1} but the dice are ${player.diceRoll.dice[0]} + ${player.diceRoll.dice[1]}` );
            break;
        }
      } 
    }
    return messages.filter(x => x !== '');
  }
  checkSppTradeSurplus(clan){
    const messages = []
    for(let team of clan.ledger.teamBuilding){
      for(let p of team.roster || []){
        if (!p.id || p.id === 0) continue;
        if (p.dice && p.spentSPP === 0) messages.push(`player ${p.name} (${team.name}) has invalid SPP data, please save the team.`);
      }
      const cost = team.roster?.reduce((p,c) => p = p + c.sppSurplus - c.spentSPP ,0);
      if (cost < 0) messages.push(`${team.name} has a SPP trade deficit.`);
    }
    return messages.filter(x => x !== '');
  }
  
  checkTeams(clan){
    return clan.ledger.teamBuilding.filter(team => !team.race).map(team => `Can't check ${team.name}, race is missing`);
  }

  checkFreshTeamRules(clan){
    const teams = clan.ledger.teamBuilding.filter(x => !x.isReturningTeam);
    return this.checkFreshTeamBasicRules(teams)
      .concat(this.checkFreshTeamStatsRules(teams))
      .concat(this.checkFreshTeamSuperstarsRules(teams))
      .concat(this.checkFreshTeamDoublesRules(teams))
      .concat(this.checkFreshTeamTierRules(teams))
      .concat(this.checkFreshTeamSpecialRaceRules(teams))
      .filter(x => x != '' && x != null);
  }

  checkReturningTeamRules(clan){
    const teams = clan.ledger.teamBuilding.filter(x => x.isReturningTeam);
    return this.checkReturningTeamBasicRules(teams)
      .concat(this.checkReturningTeamBudgetRules(teams))
      .concat(this.checkReturningTeamPlayerRules(teams))
      .filter(x => x != '' && x != null);
  }
  /* fresh team checks */
  checkFreshTeamBasicRules(teams){
    // 1.1 You must take at least 5 Fan Factor (cost is zeroed out for the first 5 Fan Factor in the clan ledger and therefore does not affect the budget of the clan).
    // 1.3 You must have at least 11 players.
    // 1.4 You must have at least 3 rookies with no skill ups.
    return teams.filter(x => !['Halfling','Goblin'].includes(x.race?.name))
      .map(team => team.fanfactor >= 5 ? '' : team.roster ? `Rule 1.1: ${team.name}, increase fan factor to at least 5` : '')
      .concat(teams.map(team => team.roster?.length >= 11 ? '' : team.roster ? `Rule 1.3: ${team.name} needs at least 11 players` : ''))
      .concat(teams.map(team => team.roster?.filter(x => x.id < 1 && !x.skill1 && !x.skill2).length >= 3 ? '' : team.roster ? `Rule 1.4: ${team.name} needs at least 3 rookie players with no skillups` : '' ))
      .filter(x => x !== '');
  }
  checkFreshTeamStatsRules(teams){
    // 2.1 You may take only 1 statistic upgrade.
    return teams.map(team => team.roster?.filter(player => ['Increase Agility','Increase Armour','Increase Movement','Increase Strength'].includes(player.skill1)).length < 2 ? '' :team.roster ? `Rule 2.1: ${team.name} has too many stats` :'' );
  }
  checkFreshTeamSuperstarsRules(teams){
    // 3.1 You may level up to 5 players to level 3, but both skills must be normals. 
    let limit = 5;
    if (teams.length === 1 && teams[0].hasLegacyPlayer) limit = 4; //legacy player counts towards 5 players with level 3

    return teams.map(team => team.roster?.filter(player => player.skill1 && player.skill2).length <= limit ? '' : team.roster ? `Rule 3.1: ${team.name} has too many level 3 players` : '')
      .concat(teams.map(team => team.roster?.filter(player => player.skill1 && player.skill2).map(player => this.isPlayerCorrectSuperstar(player) ? '' : team.roster ? `Rule 3.1: ${team.name} ${player.name} (${player.playerType.type}) has invalid skills (${player.skill1}, ${player.skill2}), these can only be normals.` : '') ))
      .flat();
  }
  checkFreshTeamDoublesRules(teams){
    // 4.1 You may only take 2 doubles from one skill type. A skill is a double if it would have required rolling the same on two d6 to take it for your race. 
    // 4.2 You may not take the same skill more than once. In other words, you can for instance take 2 strength skills as doubles, 
    //     but they cannot both be Mighty Blow, or both Guard. They could, however, be Mighty Blow on one player and Guard on another.
    let messages = [];

    for(let team of teams){
      const doubleAgilitySkills = [];
      const doublePassingSkills = [];
      const doubleStrengthSkills = [];
      const doubleMutationSkills = [];
      for(let player of team.roster ||[]){
        for(let skill of [player.skill1, player.skill2]){
          const category = this.skillDescriptions.find(x => x.name === skill)?.category
          if (player.playerType.doubles.includes(category)){
            switch(category){
              case "Agility": 
                doubleAgilitySkills.push(skill);
                break;
              case "Mutation":
                doubleMutationSkills.push(skill);
                break;
              case "Passing":
                doublePassingSkills.push(skill);
                break;
              case "Strength":
                doubleStrengthSkills.push(skill);
                break;
            }
          }
        }
      }
      if (doubleAgilitySkills.length > 2) messages.push(`Rule 4.1: ${team.name} has more than two agility double-skills.`);
      if (doubleMutationSkills.length > 2) messages.push(`Rule 4.1: ${team.name} has more than two mutation double-skills.`);
      if (doublePassingSkills.length > 2) messages.push(`Rule 4.1: ${team.name} has more than two passing double-skills.`);
      if (doubleStrengthSkills.length > 2) messages.push(`Rule 4.1: ${team.name} has more than two strength double-skills.`);

      let m = doubleAgilitySkills.map(skill => doubleAgilitySkills.filter(x => x === skill).length > 1 ? `Rule 4.2: ${team.name} has more than 1 ${skill} as a double skill.` : '');
      messages = messages.concat([...new Set(m)].filter(x => x !== ''));
      m = doubleMutationSkills.map(skill => doubleMutationSkills.filter(x => x === skill).length > 1 ? `Rule 4.2: ${team.name} has more than 1 ${skill} as a double skill.` : '');
      messages =messages.concat([...new Set(m)].filter(x => x !== ''));
      m = doublePassingSkills.map(skill => doublePassingSkills.filter(x => x === skill).length > 1 ? `Rule 4.2: ${team.name} has more than 1 ${skill} as a double skill.` : '');
      messages =messages.concat([...new Set(m)].filter(x => x !== ''));
      m = doubleStrengthSkills.map(skill => doubleStrengthSkills.filter(x => x === skill).length > 1 ? `Rule 4.2: ${team.name} has more than 1 ${skill} as a double skill.` : '');
      messages =messages.concat([...new Set(m)].filter(x => x !== ''));
    }

    return messages;
  }
  checkFreshTeamTierRules(teams){
    return this.checkFreshTeamTier1to2Rules(teams)
      .concat(this.checkFreshTeamTier3to6Rules(teams))
      .concat(this.checkFreshTeamTier7Rules(teams))
      .flat()
      .filter(x => x !== '');
  }
  checkFreshTeamSpecialRaceRules = (teams) => this.checkFreshTeamUndead(teams).concat(this.checkFreshTeamOgre(teams)).filter(x => x !== '').flat();
  checkFreshTeamUndead(teams){
    // 8.1 Undead may only buy 1 double OR 1 statistic on one of their Mummies, while the other must take a normal skill (or skills, if superstar) or be a rookie. 
    //     E.g. this means that only one Mummy may take Block, while the other must be a rookie or take a normal skill.
    teams = teams.filter(team => team.race?.name === 'Undead');
    if (teams.length === 0) return [];

    return teams.map(team => team.roster?.filter(player => player.playerType.type === 'Undead_Mummy' 
      && (
        this.isDoubleSkill(player, player.skill1) || 
        this.isDoubleSkill(player, player.skill2) || 
        this.isStatsIncrease(player.skill1) || 
        this.isStatsIncrease(player.skill2)))
      .length > 1 ? `Rule 8.1: ${team.name} may only buy 1 double OR 1 statistic on one of their Mummies` : '');
  }
  checkFreshTeamOgre(teams){
    // 8.2 Ogres may take either 3 doubles, or 1 double AND 1 statistic, on their Ogres. The other Ogres must be rookies or take normal skills. 
    //     E.g. this means that only three Ogres may take Block (if no statistic is taken), while the others must be rookies or take normal skills.
    teams = teams.filter(team => team.race?.name === 'Ogre');
    if (teams.length === 0) return [];
    const messages = [];

    for(let team of teams){
      let doubles = 0;
      let stats = 0;
      for(let player of team.roster?.filter(player => player.playerType.type === 'Ogre_Ogre')){
        for(let skill of [player.skill1, player.skill2]){
          if (this.isDoubleSkill(player,skill)) doubles++;
          if (this.isStatsIncrease(skill)) stats++;
        }
      }
      if (doubles > 3 || (doubles > 1 && stats > 1)) messages.push(`Rule 8.2: ${team.name} may take either 3 doubles, or 1 double AND 1 statistic, on their Ogres.`);
    }
    return messages;
  }
  checkFreshTeamTier1to2Rules(teams){
    const messages = [];
    teams = teams.filter(team => [1,2].includes(this.tierTax.find(x => x.race === team.race?.name)?.tier));

    if (teams.length === 0) return [];

    // 5.1 May not take Strength as statistic upgrade.
    // 5.2 May only take 2 doubles, or 1 statistic and 1 double.
    // 5.3 Must cost at least 1.2 million GP. This is the actual cost, and is not affected by tier tax or refund.
    for(let team of teams){
      let doubles = 0;
      let stats = 0;
      let legacyPlayerDoubles = 0;
      let legacyPlayerStats = 0;
      let legacyPlayer;

      for(let player of team.roster||[]){
        for(let skill of [player.skill1, player.skill2]){
          if (this.isDoubleSkill(player,skill)) doubles++;
          if (this.isStatsIncrease(skill)) stats++;
        }
        if (team.isNewBloodTeam && player.id > 0){
          legacyPlayer = player;
          for(let skill of player.skills){
            if (player.fixedSkills.indexOf(skill)>-1) continue;
            
            if (this.isDoubleSkill(player,skill)) {
              legacyPlayerDoubles++;
              doubles++;
            }
            if (this.isStatsIncrease(skill)) {
              legacyPlayerStats++;
              stats++;
            }
          }  
        }
      }
      let tooManyDoubles = doubles > 2;
      let tooManyStats = (doubles > 1 && stats > 0) || stats > 1;
      if (team.isNewBloodTeam) {
        const legacyUsedAllQuotas = legacyPlayerDoubles > 1 || ( legacyPlayerStats > 0 && legacyPlayerDoubles > 0);
        const hasAdditionalDoublesOrStats = doubles > legacyPlayerDoubles || stats > legacyPlayerStats;
        tooManyStats = doubles > 1 && stats > 0;

        if (legacyUsedAllQuotas && hasAdditionalDoublesOrStats) 
          messages.push(`Rule New Blood: ${team.name}, the legacy player ${legacyPlayer.name} has used the quota for the Tier (2 doubles, or 1 double, 1 statistic),no other doubles/stats allowed`);
        else if (!legacyUsedAllQuotas && (tooManyDoubles || tooManyStats)) 
          messages.push(`Rule 5.2: ${team.name} has more than 2 doubles or more than 1 statistic and 1 double`);
      } else if (tooManyDoubles || tooManyStats) messages.push(`Rule 5.2: ${team.name} has more than 2 doubles or more than 1 statistic and 1 double`);
      
      if (this.teamCost(team) < 1_200_000) messages.push(`Rule 5.3: ${team.name} must cost at least 1.2 million GP. This is the actual cost, and is not affected by tier tax or refund.`)
    }
    return messages;
  }
  checkFreshTeamTier3to6Rules(teams){
    const messages = [];
    teams = teams.filter(team => [3,4,5,6].includes(this.tierTax.find(x => x.race === team.race?.name)?.tier));
    
    if (teams.length === 0) return [];

    // 6.1 May take any statistic upgrade.
    // 6.2 May take 3 doubles, or 1 statistic and 1 double.
    // 6.3 Must cost at least 1.2 million GP. This is the actual cost, and is not affected by tier tax or refund.
    for(let team of teams){
      let doubles = 0;
      let stats = 0;
      let legacyPlayerDoubles = 0;
      let legacyPlayerStats = 0;
      let legacyPlayer;

      for(let player of team.roster||[]){
        for(let skill of [player.skill1, player.skill2]){
          if (this.isDoubleSkill(player,skill)) doubles++;
          if (this.isStatsIncrease(skill)) stats++;
        }
        if (team.isNewBloodTeam && player.id > 0){
          legacyPlayer = player;
          for(let skill of player.skills){
            if (player.fixedSkills.indexOf(skill)>-1) continue;

            if (this.isDoubleSkill(player,skill)) {
              legacyPlayerDoubles++;
              doubles++;
            }
            if (this.isStatsIncrease(skill)) {
              legacyPlayerStats++;
              stats++;
            }
          }  
        }
      }
      const tooManyDoubles = doubles > 3;
      let tooManyStats = (doubles > 1 && stats > 0) || stats > 1;
      if (team.isNewBloodTeam) {
        const legacyUsedAllQuotas = legacyPlayerDoubles > 2 || ( legacyPlayerStats > 0 && legacyPlayerDoubles > 0);
        const hasAdditionalDoublesOrStats = doubles > legacyPlayerDoubles || stats > legacyPlayerStats;
        tooManyStats = doubles > 1 && stats > 0;

        if (legacyUsedAllQuotas && hasAdditionalDoublesOrStats) 
          messages.push(`Rule New Blood: ${team.name}, the legacy player ${legacyPlayer.name} has used the quota for the Tier (3 doubles, or 1 double, 1 statistic),no other doubles/stats allowed`);
        else if (!legacyUsedAllQuotas && (tooManyDoubles || tooManyStats)) 
          messages.push(`Rule 6.2: ${team.name} has more than 3 doubles or more than 1 statistic and 1 double`);
        
      } else if (tooManyDoubles || tooManyStats) messages.push(`Rule 6.2: ${team.name} has more than 3 doubles or more than 1 statistic and 1 double`);

      if (this.teamCost(team) < 1_200_000) messages.push(`Rule 6.3: ${team.name} must cost at least 1.2 million GP. This is the actual cost, and is not affected by tier tax or refund.`)
    }
    return messages;    
  }
  checkFreshTeamTier7Rules(teams){
    // 7.1 May take any statistic upgrade.
    // 7.2 May take 4 doubles, or 1 statistic and 2 doubles.
    // 7.3 May take up to 4 general skills as doubles (and they can be the same skill as they are general skills). 
    // 7.4 Must cost at least 900k GP. This is the actual cost, and is not affected by tier tax or refund.
    const messages = [];
    teams = teams.filter(team => [7].includes(this.tierTax.find(x => x.race === team.race?.name)?.tier));
    
    if (teams.length === 0) return [];

    for(let team of teams){
      let doubles = 0;
      let stats = 0;
      let legacyPlayerDoubles = 0;
      let legacyPlayerStats = 0;
      let legacyPlayer;

      for(let player of team.roster||[]){
        for(let skill of [player.skill1, player.skill2]){
          if (this.isDoubleSkill(player,skill)) doubles++;
          if (this.isStatsIncrease(skill)) stats++;
        }
        if (team.isNewBloodTeam && player.id > 0){
          legacyPlayer = player;
          for(let skill of player.skills){
            if (player.fixedSkills.indexOf(skill)>-1) continue;
            
            if (this.isDoubleSkill(player,skill)) {
              legacyPlayerDoubles++;
              doubles++;
            }
            if (this.isStatsIncrease(skill)) {
              legacyPlayerStats++;
              stats++;
            }
          }  
        }
      }
      const tooManyDoubles = doubles > 4;
      let tooManyStats = (doubles > 2 && stats > 0) || stats > 1;
      if (team.isNewBloodTeam) {
        const legacyUsedAllQuotas = legacyPlayerDoubles > 3 || ( legacyPlayerStats > 0 && legacyPlayerDoubles > 1);
        const hasAdditionalDoublesOrStats = doubles > legacyPlayerDoubles || stats > legacyPlayerStats;
        tooManyStats = doubles > 2 && stats > 0;

        if (legacyUsedAllQuotas && hasAdditionalDoublesOrStats) 
          messages.push(`Rule New Blood: ${team.name}, the legacy player ${legacyPlayer.name} has used the quota for the Tier (4 doubles, or 2 doubles, 1 statistic),no other doubles/stats allowed`);
        else if (!legacyUsedAllQuotas && (tooManyDoubles || tooManyStats)) 
          messages.push(`Rule 7.2: ${team.name} has more than 4 doubles or more than 1 statistic and 2 doubles`);
      } else if (tooManyDoubles || tooManyStats) messages.push(`Rule 7.2: ${team.name} has more than 4 doubles or more than 1 statistic and 2 doubles`);
        

      if (this.teamCost(team) < 900_000) messages.push(`Rule 7.3: ${team.name} must cost at least 900 thousand GP. This is the actual cost, and is not affected by tier tax or refund.`);
    }
    return messages;    
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

    const totalCost = teamTotalCost + this.powersTotal(clan.ledger) + this.stuntyTotal(clan.ledger);

    const stuntyBudget = clan.ledger.teamBuilding.filter(team => this.tierTax.find(x => x.race === team.race?.name)?.tier === 7).length * 150_000;

    switch (clan.division){
      case "Division 1":
        if (teamTotalCost > 7_500_000) messages.push(`Your clan is overspending, your budget is 7.5 million GP.`);
        if (totalCost > 7_800_000 + stuntyBudget) messages.push(`Your clan is overspending, your budget is 7.5 million GP, and an additional 300k for clan powers.`);
        break;
      case "Division 2":
      case "Division 2a":
      case "Division 2b":
        if (teamTotalCost > 7_100_000) messages.push(`Your clan is overspending, your budget is 7.1 million GP.`);
        if (totalCost > 7_250_000 + stuntyBudget) messages.push(`Your clan is overspending, your budget is 7.1 million GP, and an additional 150k for clan powers.`);
        break;
      case "Division 3":
      case "Division 3a":
      case "Division 3b":
      case "Division 3c":
        if (teamTotalCost > 6_750_000) messages.push(`Your clan is overspending, your budget is 6.75 million GP.`);
        if (totalCost > 6_750_000 + stuntyBudget) messages.push(`Your clan is overspending, your budget is 6.75 million GP.`);
        break;
    }

    messages = messages.concat(this.powersCheck(clan.ledger));
    if (stuntyBudget === 0 && this.stuntyTotal(clan.ledger) > 0) messages.push(`No stunty powers allows.`);
    else messages = messages.concat(this.stuntyCheck(clan.ledger));

    return messages.filter(x => x !== '');
  }

  checkForCheaters(clan){
    const messages = [];
    for(let team of clan.ledger.teamBuilding){
      for(let player of team.roster||[]){
        const playerSkills = this.skills[player.playerType.type] || [];
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
    let cyanideTeam = await cyanide.team({name:cyanideTeamName});
    if (!cyanideTeam || !cyanideTeam.team) {
      messages.push(`Could not find team ${cyanideTeamName} in BB2`);
      return messages;
    }
    if (cyanideTeam.team.cash > 0) messages.push(`Needs to dump ${cyanideTeam.team.cash} before their first game (buy & fire players, not rerolls/coaches/cheerleaeders)`);
    
    if (Number(cyanideTeam.team.rerolls) !== Number(ledgerTeam.rerolls)) messages.push(`Number of rerolls don't match (${cyanideTeam.team.rerolls} vs ${ledgerTeam.rerolls})`);
    if (Number(cyanideTeam.team.popularity) !== Number(ledgerTeam.fanfactor)) messages.push(`The fanfactor doesn't match (${cyanideTeam.team.popularity} vs ${ledgerTeam.fanfactor})`);
    if (Number(cyanideTeam.team.cheerleaders) !== Number(ledgerTeam.cheerleaders)) messages.push(`Number of cheerleaders don't match (${cyanideTeam.team.cheerleaders} vs ${ledgerTeam.cheerleaders})`);
    if (Number(cyanideTeam.team.assistantcoaches) !== Number(ledgerTeam.coaches)) messages.push(`Number of assistantcoaches don't match (${cyanideTeam.team.assistantcoaches} vs ${ledgerTeam.coaches})`);
    if (ledgerTeam.apothecary !== (cyanideTeam.team.apothecary == 1 ? true : false) ) messages.push(`Apothecary doesn't match`);
    if (Number(cyanideTeam.team.stadiumlevel) != 1) messages.push(`You can only have level 1 stadiums`);

    for(let player of ledgerTeam.roster||[]){
      const createdPlayer = cyanideTeam.roster?.find(p => p.name+"" === player.name+"");
      if (!createdPlayer) {
        messages.push(`Could not find player ${player.name} on the BB2 team`);
        continue;
      }
      if (createdPlayer.type !== player.playerType.type) messages.push(`Player ${createdPlayer.name} (${player.playerType.type}) does not match the position defined on the ledger (${createdPlayer.type})`);
      let skills = player.skills || [];
      if (player.skill1) skills.push(player.skill1.replace(/ /g,''));
      if (player.skill2) skills.push(player.skill2.replace(/ /g,''));
      const playerSkills = this.skills[player.playerType.type] || [];
      skills = skills.concat(playerSkills).map(x => x);
      for (let skill of skills){
        if (!createdPlayer.skills.map(skill => skill.replace(/ /g, '').trim()).includes(skill) && !playerSkills.includes(skill)) messages.push(`${player.name} is missing skill ${skill}`);
      }
      for(let skill of createdPlayer.skills){
        if (!skills.includes(skill.replace(/ /g, '').trim())) messages.push(`${player.name} has skill ${skill.replace(/([A-Z])/g, ' $1').trim()} too many`);
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
    let lastMatchDate = new Date(team.team.datelastmatch);
    
    const offsets = [-6,0,-1,-2,-3,-4,-5];

    let startOfRound = lastMatchDate;
    startOfRound.setDate(startOfRound.getDate() + offsets[lastMatchDate.getDay()]);

    const week = util.getISOWeek(startOfRound);
    if (week % 2 === 0) startOfRound.setDate(startOfRound.getDate() - 7); // change according to if round 1 starts on even or uneven week

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
      .concat(this.checkFreshTeamStatsRules([newTeam]))
      .concat(this.checkFreshTeamSuperstarsRules([newTeam]))
      .concat(this.checkFreshTeamDoublesRules([newTeam]))
      .concat(this.checkFreshTeamTierRules([newTeam]))
      .concat(this.checkFreshTeamSpecialRaceRules([newTeam]))
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
  getSkillCost = (player, skill) => {
    let skillCost = skill ? 20_000 : 0;
    if (this.isStatsIncrease(skill)) {
      switch(skill){
        case 'Increase Movement':
        case 'Increase Armour':
          skillCost = 30_000;
          break;
        case 'Increase Agility':
          skillCost = 40_000;
          break;
        case 'Increase Strength':
          skillCost = 50_000;
          break;
      }
    } 
    else if (this.isDoubleSkill(player, skill)) skillCost = 30_000;
    return skillCost;
  }
  
  medicalBill = (player) => player.casualties.reduce((p,c) => p += c.removed ? 1 : 0 ,0) * 100_000;
  playerCost(player) {
    if (player.id && player.id > 0){
      return player.value * 1000 + this.medicalBill(player) + this.getSkillCost(player,player.skill1);
    }

    const cost = player.playerType.cost + this.getSkillCost(player,player.skill1) + (player.skill2 ? 20000 : 0 )
    return cost;
  }
  
  rosterCost = (team) => team.roster?.reduce((p,c) => p + this.playerCost(c) ,0);
  rerollCost = (team) => team.race ? team.race.reroll : 50000;
  subTotalRerolls = (team) => team.rerolls * this.rerollCost(team) + (Number(team.cheerleaders) + Number(team.coaches) + Math.max(Number(team.fanfactor) - 5,0)) * 10000 + (team.apothecary ? 50000 : 0);
  
  isSuperstar = (player) => player.skill1 && player.skill2;
  isSkilled = (player) => player.id > 0 && player.skill1;
  isLegacy = (player) => player.id > 0;
  superstarTax = (team) => team.roster?.filter(player => this.isSuperstar(player) || this.isSkilled(player)).reduce((p,c,i) => {
    if (this.isSkilled(c)) p += 10;
    else p = p + 10*( i + (team.isNewBloodTeam && team.hasLegacyPlayer ? 2 : 1));
    return p;
    }, 0) * 1000

  teamCost = (team) => {
    return this.rosterCost(team) + this.subTotalRerolls(team) + this.superstarTax(team);
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