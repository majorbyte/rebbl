'use strict';

const { team } = require('./CyanideService.js');

const 
  bloodBowlService = require('./bloodbowlService.js'),
  dataService = require('./DataService.js').rebbl;


class ClanValidationService {
  constructor(){
    this.division1 = ['WKNAT','NOOB','BBT','CLASSY','FUM','WCW','METAL','FP','CO','IRON'];
    this.division2 = ['REL','BROMBE','DICED','GODS','ZX','FABBL','READ','1PTTP1','COOKIE','ANZAC','SNAKES','KEG','KLAANI','DVLA','POMB','BBQ','BOSC','DUDE','JOKE','SALTY'];

    this.divisions = [
      {name: 'Division 1',budget:7_500_000, powerBudget: 300_000},
      {name: 'Division 2',budget:7_100_000, powerBudget: 150_000},
      {name: 'Division 3',budget:6_750_000, powerBudget: 0}
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
      {race:'Lizardman', tier:	1, rebate: 150_000},
      {race:'Necromantic', tier:	1, rebate: 150_000},
      {race:'Orc', tier:	1, rebate: 150_000},

      {race:'Amazon', tier:	2, rebate: 100_000},
      {race:'Chaos Dwarf', tier:	2, rebate: 100_000},
      {race:'Khemri', tier:	2, rebate: 100_000},
      {race:'Skaven', tier:	2, rebate: 100_000},
      {race:'Wood Elf', tier:	2, rebate: 100_000},

      {race:'Chaos', tier:	3, rebate: 50_000},
      {race:'Dark Elf', tier:	3, rebate: 50_000},
      {race:'Dwarf', tier:	3, rebate: 50_000},
      {race:'Nurgle', tier:	3, rebate: 50_000},
      {race:'Undead', tier:	3, rebate: 50_000},

      {race:'Human', tier:	4, rebate: 0},
      {race:'High Elf', tier:	4, rebate: 0},

      {race:'Bretonnian', tier:	5, rebate: -50_000},
      {race:'Elven Union', tier:	5, rebate: -50_000},
      {race:'Norse', tier:	5, rebate: -50_000},

      {race:'Kislev', tier:	6, rebate: -100_000},
      {race:'Ogre', tier:	6, rebate: -100_000},
      {race:'Underworld Denizens', tier:	6, rebate: -100_000},
      {race:'Vampire', tier:	6, rebate: -100_000},

      {race:'Goblin', tier:	7, rebate: 0},
      {race:'Halfling', tier:	7, rebate: 0},
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

    bloodBowlService.getSkills().then(skills => this.skills = skills);
    bloodBowlService.getSkillDescriptions().then(skillDescriptions => this.skillDescriptions = skillDescriptions);
  }

  async validate(clanName){
    const clan = await dataService.getClan({name:clanName,season:'season 13'})

    const validationErrors = {};
    
    validationErrors.sppTradeErrors = await this.checkSppTrades(clan);
    validationErrors.sppTradeSkillErrors = await this.checkSppTradeSkills(clan);
    validationErrors.sppTradeAccounting = this.checkSppTradeSurplus(clan);

    validationErrors.incompleteTeamErrors = await this.checkTeams(clan);

    validationErrors.freshTeamErrors = await this.checkFreshTeamRules(clan);

    //validationErrors.ReturningTeamErros = await this.checkReturningTeamRules(clan);


    return validationErrors;
  }

  async checkSppTrades(clan){
    const players = await dataService.getPlayers({'diceRoll.clan':clan.name});

    const messages = players.map(player => clan.ledger.teamBuilding.some(team => team.roster.find(x => x.id === player.id)) ? '' : `player ${player.name} has a diceroll, but is not used.`);
    return messages.filter(x => x !== '');
  }
  async checkSppTradeSkills(clan){
    const players = await dataService.getPlayers({'diceRoll.clan':clan.name});

    const messages = players.map(player => clan.ledger.teamBuilding.some(team => team.roster.find(x => x.id === player.id)?.skill1) ? '' : `player ${player.name} has a diceroll, but no skill is chosen.`);
    return messages.filter(x => x !== '');
  }
  checkSppTradeSurplus(clan){
    const messages = []
    for(let team of clan.ledger.teamBuilding){
      for(let p of team.roster){
        if (!p.id || p.id === 0) continue;
        if (p.dice && p.spentSPP === 0) messages.push(`player ${p.name} (${team.name}) has invalid SPP data, please save the team.`);
      }
      const cost = team.roster.reduce((p,c) => p = p + c.sppSurplus - c.spentSPP ,0);
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


  checkFreshTeamBasicRules(teams){
    // 1.1 You must take at least 5 Fan Factor (cost is zeroed out for the first 5 Fan Factor in the clan ledger and therefore does not affect the budget of the clan).
    // 1.3 You must have at least 11 players.
    // 1.4 You must have at least 3 rookies with no skill ups.
    return teams.filter(x => !['Halfling','Goblin'].includes(x.race?.name)).map(team => team.fanfactor >= 5 ? '' : `Rule 1.1: ${team.name}, increase fan factor to at least 5`)
      .concat(teams.map(team => team.roster.length >= 11 ? '' : `Rule 1.3: ${team.name} needs at least 11 players`))
      .concat(teams.map(team => team.roster.filter(x => !x.skill1 && !x.skill2).length >= 3 ? '' : `Rule 1.4: ${team.name} needs at least 3 rookie players with no skillups` ))
      .filter(x => x !== '');
  }
  checkFreshTeamStatsRules(teams){
    // 2.1 You may take only 1 statistic upgrade.
    return teams.map(team => team.roster.filter(player => ['Increase Agility','Increase Armour','Increase Movement','Increase Strength'].includes(player.skill1)).length < 2 ? '' : `Rule 2.1: ${team.name} has too many stats` );
  }

  checkFreshTeamSuperstarsRules(teams){
    // 3.1 You may level up to 5 players to level 3, but both skills must be normals. 
    return teams.map(team => team.roster.filter(player => player.skill1 && player.skill2).length <=5 ? '' : `Rule 3.1: ${team.name} has too many level 3 players`)
      .concat(teams.map(team => team.roster.filter(player => player.skill1 && player.skill2).map(player => this.isPlayerCorrectSuperstar(player) ? '' : `Rule 3.1: ${team.name} ${player.name} (${player.playerType.type}) has invalid skills (${player.skill1}, ${player.skill2}), these can only be normals.`) ))
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
      for(let player of team.roster){
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
  checkFreshTeamSpecialRaceRules = (teams) => this.checkFreshTeamUndead(teams).concat(this.checkFreshTeamOgre).filter(x => x !== '').flat();

  checkFreshTeamUndead(teams){
    // 8.1 Undead may only buy 1 double OR 1 statistic on one of their Mummies, while the other must take a normal skill (or skills, if superstar) or be a rookie. 
    //     E.g. this means that only one Mummy may take Block, while the other must be a rookie or take a normal skill.
    teams = teams.filter(team => team.race?.name === 'Undead');
    if (teams.length === 0) return [];

    return teams.map(team => team.roster.filter(player => player.playerType.type === 'Undead_Mummy' 
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
      for(let player of team.roster.filter(player => player.playerType.type === 'Ogre_Ogre')){
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
      for(let player of team.roster){
        for(let skill of [player.skill1, player.skill2]){
          if (this.isDoubleSkill(player,skill)) doubles++;
          if (this.isStatsIncrease(skill)) stats++;
          if (skill === 'Increase Strength') messages.push(`Rule 5.1: ${team.name} strength increase not allowed`);
        }
      }
      if (doubles > 2 || (doubles > 1 && stats > 1)) messages.push(`Rule 5.2: ${team.name} has more than 2 doubles or more than 1 statistic and 1 double`);

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
      for(let player of team.roster){
        for(let skill of [player.skill1, player.skill2]){
          if (this.isDoubleSkill(player,skill)) doubles++;
          if (this.isStatsIncrease(skill)) stats++;
        }
      }
      if (doubles > 3 || (doubles > 1 && stats > 1)) messages.push(`Rule 6.2: ${team.name} has more than 3 doubles or more than 1 statistic and 1 double`);

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
    for(let team of teams){
      let doubles = 0;
      let stats = 0;
      for(let player of team.roster){
        for(let skill of [player.skill1, player.skill2]){
          if (this.isDoubleSkill(player,skill)) doubles++;
          if (this.isStatsIncrease(skill)) stats++;
        }
      }
      if (doubles > 4 || (doubles > 2 && stats > 1)) messages.push(`Rule 7.2: ${team.name} has more than 3 doubles or more than 1 statistic and 1 double`);

      if (this.teamCost(team) < 900_000) messages.push(`Rule 7.3: ${team.name} must cost at least 1.2 million GP. This is the actual cost, and is not affected by tier tax or refund.`)
    }
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

    
    return player.playerType.cost + this.getSkillCost(player,player.skill1) + (player.skill2 ? 20000 : 0 );
  }
  
  rosterCost = (team) => team.roster.reduce((p,c) => p + this.playerCost(c) ,0);
  rerollCost = (team) => team.race ? team.race.reroll : 50000;
  subTotalRerolls = (team) => team.rerolls * this.rerollCost(team) + (Number(team.cheerleaders) + Number(team.coaches) + Math.max(Number(team.fanfactor) - 5,0)) * 10000 + (team.apothecary ? 50000 : 0);
  
  isSuperstar = (player) => player.skill1 && player.skill2;
  isSkilled = (player) => player.id > 0 && player.skill1;
  superstarTax = (team) => team.roster.filter(player => this.isSuperstar(player) || this.isSkilled(player)).reduce((p,c,i) => {
    if (this.isSkilled(c)) p += 10;
    else p = p + 10*(i+1);
    return p;
    }, 0) * 1000

  teamCost = (team) => this.rosterCost(team) + this.subTotalRerolls(team) + this.superstarTax(team);
}

module.exports = new  ClanValidationService();