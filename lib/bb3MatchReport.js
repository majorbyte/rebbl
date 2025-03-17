"use strict";
const axios = require("axios"),
dataService = require("./DataService.js").rebbl,
dataServiceBB3 = require("./DataServiceBB3.js").rebbl3;


class BB3MatchReport{
  constructor(){}

  async matchReport (uuid, hookUrl){
  
    const match = await dataServiceBB3.getMatch({matchId:uuid});  
    if (!match)return;
    if (match.reported) return;
  
    let embed = {
      "title": `${match.homeGamer.name} vs ${match.awayGamer.name}`,
      "url":`https://rebbl.net/match/${match.gameId}`,
      "description":`[${match.homeTeam.name}](https://rebbl.net/team/${match.homeTeam.id}) vs. [${match.awayTeam.name}](https://rebbl.net/team/${match.awayTeam.id})
      [${match.competition.name}](https://rebbl.net/${competition.id}/standings)
      `,
      "color": 187908,
      "thumbnail": {
        "url": this.#getLogo(match)
      }/*,
      "author": {
        "name": "Griff Oberwald",
        "icon_url": "https://cdn.rebbl.net/images/logo/256x256/logo_human_18.png"
      }*/,
      "fields": [
        {
          "name": "**gamestats**",
          "value": this.#getStats(match.statistics),
          "inline": true
        },
        {
          "name": "**injuries home**",
          "value": this.#getInjuries(match.homeTeam.roster, match.homeTeam.name),
          "inline": true
        },
        {
          "name": "**injuries away**",
          "value": this.#getInjuries(match.awayTeam.roster, match.awayTeam.name),
          "inline": true
        }
      ]
    }; 
    

    const webhooks = await dataService.getHooksWithUrl();

    
    let hooks = webhooks.filter(webbhook => webbhook.races.some(race => race == match.homeTeam.race || race == match.awayTeam.race));//.map(x => x.url);

    hooks = hooks.concat(webhooks.filter(webbhook => webbhook.competitions.some(competition => /\/(.+)\/.*/.test(competition) ? this.#stringToRegex(competition).test(match.competition.name) : competition == match.competition.name)));//.map(x => x.url));

    hooks = hooks.concat(webhooks.filter(webbhook => webhooks.bb3coach && (match.awayGamer.id == webbhook.bb3coach || match.homeGamer.id == webbhook.bb3coach)));//.map(x => x.url));

    hooks = [...new Set(hooks)];

    const body = function(hook){
        const data = {embeds: [ embed ]};

      if (hook.avatarUrl) data.avatar_url = hook.avatarUrl;
      if (hook.displayName) data.username = hook.displayName;

      
      return JSON.stringify(data);
    }

    /*axios.post(hookUrl, JSON.stringify(data),{headers:{"Content-Type": "application/json"}})*/
    await Promise.all(hooks.map(hook => axios
        .post(hook.url, body(hook),{headers:{"Content-Type": "application/json"}})
        .catch(async error => {
            if (error.response.status == 404){
                // Hook is probably removed
                dataService.updateHook({id:hook.id},{$set:{active:false}})
            } else {
                console.log(error.response);
            }
        })   
    ))
    .catch(error => { console.log(error.response); })
    .finally(async _ => { await dataServiceBB3.updateMatch({matchId:uuid},{$set:{reported:true}});});

  }

    #stringToRegex = str => {
        // Main regex
        const main = str.match(/\/(.+)\/.*/)[1]
        
        // Regex options
        const options = str.match(/\/.+\/(.*)/)[1]
        
        // Compiled regex
        return new RegExp(main, options)
    }
  
  #getStats (statistics){
    return `\`\`\`python
    home away
TD    ${this.#getStatistic(statistics,18)}     
Blk   ${this.#getStatistic(statistics,26)}
AVBr  ${this.#getStatistic(statistics,61)}
KO    ${this.#getStatistic(statistics,25)}
Cas+  ${this.#getStatistic(statistics,19)}
Cas-  ${this.#getStatistic(statistics,28)}
Kills ${this.#getStatistic(statistics,21)}
Death ${this.#getStatistic(statistics,31)}
  \`\`\`
     `  
  }

  #getStatistic (stats, id){
    if (!Array.isArray(stats.homeGamerStatistics.teamStatistics.statistics.statistic)) stats.homeGamerStatistics.teamStatistics.statistics.statistic = [stats.homeGamerStatistics.teamStatistics.statistics.statistic];
    if (!Array.isArray(stats.awayGamerStatistics.teamStatistics.statistics.statistic)) stats.awayGamerStatistics.teamStatistics.statistics.statistic = [stats.awayGamerStatistics.teamStatistics.statistics.statistic];
    const home = stats.homeGamerStatistics.teamStatistics.statistics.statistic?.find(x => Number(x?.id) == id);
    const away = stats.awayGamerStatistics.teamStatistics.statistics.statistic?.find(x => Number(x?.id) == id);
    return `${home?.value.padStart(2, ' ') || " 0"}  ${away?.value.padStart(2, ' ') || " 0"}`
  }

  #getInjuries (players,teamName){
    if (!Array.isArray(players)) players = [players];
    let text = `__**${teamName}**__
    ${players.filter(x => x.casualties.length > 0).map(this.#getPlayerText).join('\n')}`;
  
    return text;
  }  

  #getLogo = match => match.homeScore > match.awayScore 
    ? `https://cdn.rebbl.net/images/bb3/Logos/256x256/${match.homeTeam.logo.icon}`
    : match.homeScore < match.awayScore 
      ? `https://cdn.rebbl.net/images/bb3/Logos/256x256/${match.awayTeam.logo.icon}`
      :"https://cdn.rebbl.net/images/cards/fans_small.png";
  

  #getPlayerText = player => player.type.startsWith("neutral") 
    ? `**${this.#getPosition(player.type)}**
  **${this.#getCasualties(player.casualties)}** 
  `
    : `${player.name } 
  *${this.#getPosition(player.type)}*
  **${this.#getCasualties(player.casualties)}** 
  (${player.xp + player.xpGained } SPP -  level ${player.level})
  `;


  #getCasualties = function(casualties){
    if (casualties.length == 0) return "";
    switch(casualties[0]){
      case 1: return "badly hurt";
      case 2: return "seriously hurt";
      case 3: return "serious injury";
      case 4: return "lasting injury";
      case 5: return "smashed knee";
      case 6: return "head injury";
      case 7: return "broken arm";
      case 8: return "neck injury";
      case 9: return "dislocated shoulder";
      case 10: return "dead";
    }
  }

  #getPosition = function(type){

    const positions = [
      {
          code: 1, 
          data: "human_humanLineman",
          silhouette:"human_humanLineman"
      }, 
      {
          code: 2, 
          data: "human_humanCatcher",
          silhouette:"human_humanCatcher"
      }, 
      {
          code: 3, 
          data: "human_humanThrower",
          silhouette:"human_humanThrower"
      }, 
      {
          code: 4, 
          data: "human_humanBlitzer",
          silhouette:"human_humanBlitzer"
      }, 
      {
          code: 5, 
          data: "human_ogre",
          silhouette:"human_ogre"
      }, 
      {
          code: 6, 
          data: "dwarf_dwarfBlocker",
          silhouette:"dwarf_dwarfBlocker"
      }, 
      {
          code: 7, 
          data: "dwarf_dwarfRunner",
          silhouette:"dwarf_dwarfRunner"
      }, 
      {
          code: 8, 
          data: "dwarf_dwarfBlitzer",
          silhouette:"dwarf_dwarfBlitzer"
      }, 
      {
          code: 9, 
          data: "dwarf_dwarfTrollSlayer",
          silhouette:"dwarf_dwarfTrollSlayer"
      }, 
      {
          code: 10, 
          data: "dwarf_dwarfDeathroller",
          silhouette:"dwarf_dwarfDeathroller"
      }, 
      {
        code: 11, 
        data: "amazon_humanLinewoman",
        silhouette: "amazon_humanLinewoman"
        }, 
        {
            code: 12, 
            data: "amazon_humanThrower",
            silhouette: "amazon_humanThrower"
        }, 
        {
            code: 13, 
            data: "amazon_humanBlitzer",
            silhouette: "amazon_humanBlitzer"
        }, 
        {
            code: 14, 
            data: "amazon_humanBlocker",
            silhouette: "amazon_humanBlocker"
        }, 

      {
          code: 21, 
          data: "orc_orcLineman",
          silhouette:"orc_orcLineman"
      }, 
      {
          code: 22, 
          data: "orc_goblin",
          silhouette:"orc_goblin"
      }, 
      {
          code: 23, 
          data: "orc_orcThrower",
          silhouette:"orc_orcThrower"
      }, 
      {
          code: 24, 
          data: "orc_bigUnBlocker",
          silhouette:"orc_bigUnBlocker"
      }, 
      {
          code: 25, 
          data: "orc_orcBlitzer",
          silhouette:"orc_orcBlitzer"
      }, 
      {
          code: 26, 
          data: "orc_troll",
          silhouette:"orc_troll"
      }, 
      {
          code: 30, 
          data: "goblin_goblin",
          silhouette:"goblin_goblin"
      }, 
      {
          code: 31, 
          data: "goblin_goblinLooney",
          silhouette:"goblin_goblinLooney"
      }, 
      {
          code: 32, 
          data: "chaosChosen_beastmanRunner",
          silhouette:"chaosChosen_beastmanRunner"
      }, 
      {
          code: 33, 
          data: "chaosChosen_chosenBlocker",
          silhouette:"chaosChosen_chosenBlocker"
      }, 
      {
          code: 34, 
          data: "chaosChosen_minotaur",
          silhouette:"chaosChosen_minotaur"
      }, 
      {
          code: 35, 
          data: "norse_humanRaider",
          silhouette:"norse_humanRaider"
      }, 
      {
          code: 36, 
          data: "norse_humanBerserker",
          silhouette:"norse_humanBerserker"
      }, 
      {
          code: 37, 
          data: "norse_beerBoar",
          silhouette:"norse_beerBoar"
      }, 
      {
          code: 38, 
          data: "norse_humanValkyrie",
          silhouette:"norse_humanValkyrie"
      }, 
      {
          code: 39, 
          data: "norse_ulfwerener",
          silhouette:"norse_ulfwerener"
      }, 
      {
          code: 40, 
          data: "norse_yhetee",
          silhouette:"norse_yhetee"
      },      
      {
          code: 44, 
          data: "goblin_troll",
          silhouette:"goblin_troll"
      }, 
      {
          code: 45, 
          data: "goblin_goblinPogoer",
          silhouette:"goblin_goblinPogoer"
      }, 
      {
          code: 46, 
          data: "goblin_goblinFanatic",
          silhouette:"goblin_goblinFanatic"
      }, 
      {
          code: 47, 
          data: "darkElf_darkElfLineman",
          silhouette:"darkElf_darkElfLineman"
      }, 
      {
          code: 48, 
          data: "darkElf_darkElfRunner",
          silhouette:"darkElf_darkElfRunner"
      }, 
      {
          code: 49, 
          data: "darkElf_darkElfAssassin",
          silhouette:"darkElf_darkElfAssassin"
      }, 
      {
          code: 50, 
          data: "darkElf_darkElfBlitzer",
          silhouette:"darkElf_darkElfBlitzer"
      }, 
      {
          code: 51, 
          data: "darkElf_darkElfWitchElf",
          silhouette:"darkElf_darkElfWitchElf"
      }, 
      {
          code: 60, 
          data: "halfling_halflingHopeful",
          silhouette:"halfling_halflingHopeful"
      }, 
      {
          code: 61, 
          data: "halfling_treeman",
          silhouette:"halfling_treeman"
      }, 
      {
          code: 73, 
          data: "elvenUnion_elfThrower",  
          silhouette:"elvenUnion_elfThrower"
      }, 
      {
          code: 75, 
          data: "elvenUnion_elfBlitzer",
          silhouette:"elvenUnion_elfBlitzer"
      }, 
      {
          code: 77, 
          data: "elvenUnion_elfLineman",
          silhouette:"elvenUnion_elfLineman"
      }, 
      {
          code: 79, 
          data: "elvenUnion_elfCatcher",
          silhouette:"elvenUnion_elfCatcher"
      }, 
      {
          code: 107, 
          data: "goblin_goblinBomma",
          silhouette:""
      }, 
      {
          code: 1000, 
          data: "blackOrc_blackOrc",
          silhouette:"blackOrc_blackOrc"
      }, 
      {
          code: 1001, 
          data: "blackOrc_goblinBruiser",
          silhouette:"blackOrc_goblinBruiser"
      }, 
      {
          code: 1002, 
          data: "blackOrc_troll",
          silhouette:"blackOrc_Troll"
      }, 
      {
          code: 1006, 
          data: "chaosRenegade_darkElf",
          silhouette:"darkElf_darkElfLineman"
      }, 
      {
          code: 1007, 
          data: "chaosRenegade_goblin",
          silhouette:"orc_goblin"
      }, 
      {
          code: 1008, 
          data: "chaosRenegade_humanLineman",
          silhouette:"human_humanLineman"
      }, 
      {
          code: 1009, 
          data: "chaosRenegade_humanThrower",
          silhouette:"human_humanThrower"
      }, 
      {
          code: 1010, 
          data: "chaosRenegade_minotaur",
          silhouette:"chaosRenegade_minotaur"
      }, 
      {
          code: 1011, 
          data: "chaosRenegade_ogre",
          silhouette:"chaosRenegade_ogre"
      }, 
      {
          code: 1012, 
          data: "chaosRenegade_orc",
          silhouette:"orc_orclineman"
      }, 
      {
          code: 1013, 
          data: "chaosRenegade_skaven",
          silhouette:"skaven_skavenLineman"
      }, 
      {
          code: 1014, 
          data: "chaosRenegade_troll",
          silhouette:"orc_troll"
      }, 
      {
          code: 1015, 
          data: "goblin_goblinDoomDiver",
          silhouette:"goblin_goblinDoomDiver"
      }, 
      {
          code: 1016, 
          data: "goblin_goblinOoligan",
          silhouette:"goblin_goblinOoligan"
      }, 
      {
          code: 1017, 
          data: "halfling_halflingCatcher",
          silhouette:"halfling_halflingCatcher"
      }, 
      {
          code: 1018, 
          data: "halfling_halflingHefty",
          silhouette:"halfling_halflingHefty"
      }, 
      {
          code: 1019, 
          data: "human_halflingHopeful",
          silhouette:"human_halflingHopeful"
      }, 
      {
          code: 1020, 
          data: "imperialNobility_humanRetainer",
          silhouette:"imperialNobility_humanRetainer"
      }, 
      {
          code: 1021, 
          data: "imperialNobility_humanThrower",
          silhouette:"imperialNobility_humanThrower"
      }, 
      {
          code: 1022, 
          data: "imperialNobility_humanNobleBlitzer",
          silhouette:"imperialNobility_humanNobleBlitzer"
      }, 
      {
          code: 1023, 
          data: "imperialNobility_humanBodyguard",
          silhouette:"imperialNobility_humanBodyguard"
      }, 
      {
          code: 1024, 
          data: "imperialNobility_ogre",
          silhouette:"imperialNobility_ogre"
      }, 
      {
          code: 1029, 
          data: "lizardman_skinkRunner",
          silhouette:"lizardman_skinkRunner"
      }, 
      {
          code: 1030, 
          data: "lizardman_skinkChameleon",
          silhouette:"lizardman_skinkChameleon"
      }, 
      {
          code: 1031, 
          data: "lizardman_saurusBlocker",
          silhouette:"lizardman_saurusBlocker"
      }, 
      {
          code: 1032, 
          data: "lizardman_kroxigor",
          silhouette:"lizardman_kroxigor"
      }, 
      {
          code: 1045, 
          data: "necromanticHorror_fleshGolem",
          silhouette:"necromanticHorror_fleshGolem"
      }, 
      {
          code: 1046, 
          data: "necromanticHorror_ghoulRunner",
          silhouette:"necromanticHorror_ghoulRunner"
      }, 
      {
          code: 1047, 
          data: "necromanticHorror_werewolf",
          silhouette:"necromanticHorror_werewolf"
      }, 
      {
          code: 1048, 
          data: "necromanticHorror_wraith",
          silhouette:"necromanticHorror_wraith"
      }, 
      {
          code: 1049, 
          data: "necromanticHorror_zombie",
          silhouette:"necromanticHorror_zombie"
      }, 
      {
          code: 1056, 
          data: "nurgle_beastmanPestigor",
          silhouette:"nurgle_beastmanPestigor"
      }, 
     
      {
          code: 1057, 
          data: "nurgle_bloater",
          silhouette:"nurgle_bloater"
      }, 
      {
          code: 1058, 
          data: "nurgle_rotspawn",
          silhouette:"nurgle_rotspawn"
      }, 
      {
          code: 1059, 
          data: "nurgle_rotter",
          silhouette:"nurgle_rotter"
      }, 
      {
          code: 1063, 
          data: "oldWorldAlliance_dwarfBlitzer",
          silhouette:"dwarf_dwarfBlitzer"
      }, 
      {
          code: 1064, 
          data: "oldWorldAlliance_dwarfBlocker",
          silhouette:"dwarf_dwarfBlocker"
      }, 
      {
          code: 1065, 
          data: "oldWorldAlliance_dwarfRunner",
          silhouette:"dwarf_dwarfRunner"
      }, 
      {
          code: 1066, 
          data: "oldWorldAlliance_dwarfTrollSlayer",
          silhouette:"dwarf_dwarfTrollSlayer"
      }, 
      {
          code: 1067, 
          data: "oldWorldAlliance_halflingHopeful",
          silhouette:"human_halflingHopeful"
      }, 
      {
          code: 1068, 
          data: "oldWorldAlliance_humanBlitzer",
          silhouette:"human_humanBlitzer"
      }, 
      {
          code: 1069, 
          data: "oldWorldAlliance_humanCatcher",
          silhouette:"human_humanCatcher"
      }, 
      {
          code: 1070, 
          data: "oldWorldAlliance_humanLineman",
          silhouette:"human_humanLineman"
      }, 
      {
          code: 1071, 
          data: "oldWorldAlliance_humanThrower",
          silhouette:"human_humanThrower"
      }, 
      {
          code: 1072, 
          data: "oldWorldAlliance_ogre",
          silhouette:"human_ogre"
      }, 
      {
          code: 1073, 
          data: "shamblingUndead_ghoulRunner",
          silhouette:"shamblingUndead_ghoulRunner"
      }, 
      {
          code: 1074, 
          data: "shamblingUndead_mummy",
          silhouette:"shamblingUndead_mummy"
      }, 
      {
          code: 1075, 
          data: "shamblingUndead_skeleton",
          silhouette:"shamblingUndead_skeleton"
      }, 
      {
          code: 1076, 
          data: "shamblingUndead_wightBlitzer",
          silhouette:"shamblingUndead_wightBlitzer"
      }, 
      {
          code: 1077, 
          data: "shamblingUndead_zombie",
          silhouette:"shamblingUndead_zombie"
      }, 
      {
          code: 1078, 
          data: "skaven_ratOgre",
          silhouette:"skaven_ratOgre"
      }, 
      {
          code: 1079, 
          data: "skaven_skavenBlitzer",
          silhouette:"skaven_skavenBlitzer"
      }, 
      {
          code: 1080, 
          data: "skaven_skavenGutterRunner",
          silhouette:"skaven_skavenGutterRunner"
      }, 
      {
          code: 1081, 
          data: "skaven_skavenLineman",
          silhouette:"skaven_skavenLineman"
      }, 
      {
          code: 1082, 
          data: "skaven_skavenThrower",
          silhouette:"skaven_skavenThrower"
      }, 
      {
          code: 1090, 
          data: "underworldDenizen_goblin",
          silhouette:"underworldDenizen_goblin"
      }, 
      {
          code: 1091, 
          data: "underworldDenizen_skavenBlitzer",
          silhouette:"underworldDenizen_skavenBlitzer"
      }, 
      {
          code: 1092, 
          data: "underworldDenizen_skavenGutterRunner",
          silhouette:"underworldDenizen_skavenGutterRunner"
      }, 
      {
          code: 1093, 
          data: "underworldDenizen_skavenLineman",
          silhouette:"underworldDenizen_skavenLineman"
      }, 
      {
          code: 1094, 
          data: "underworldDenizen_skavenThrower",
          silhouette:"underworldDenizen_skavenThrower"
      }, 
      {
          code: 1095, 
          data: "underworldDenizen_troll",
          silhouette:"underworldDenizen_troll"
      }, 
      {
          code: 1098, 
          data: "woodElf_treeman",
          silhouette:"woodElf_treeman"
      }, 
      {
          code: 1099, 
          data: "woodElf_woodElfCatcher",
          silhouette:"woodElf_woodElfCatcher"
      }, 
      {
          code: 1100, 
          data: "woodElf_woodElfLineman",
          silhouette:"woodElf_woodElfLineman"
      }, 
      {
          code: 1101, 
          data: "woodElf_woodElfThrower",
          silhouette:"woodElf_woodElfThrower"
      }, 
      {
          code: 1102, 
          data: "woodElf_woodElfWardancer",
          silhouette:"woodElf_woodElfWardancer"
      }, 
      {
          code: 1103, 
          data: "chaosChosen_troll",
          silhouette:"orc_troll"
      }, 
      {
          code: 1104, 
          data: "chaosChosen_ogre",
          silhouette:"human_ogre"
      }, 
      {
          code: 1105, 
          data: "oldWorldAlliance_treeman",
          silhouette:"oldWorldAlliance_treeman"
      }, 
      {
          code: 1106, 
          data: "chaosRenegade_ratOgre",
          silhouette:"skaven_ratOgre"
      }, 
      {
          code: 1107, 
          data: "underworldDenizen_ratOgre",
          silhouette:"underworldDenizen_ratOgre"
      }, 
      {
          code: 1108, 
          data: "underworldDenizen_snotling",
          silhouette:"underworldDenizen_snotling"
      }, 
      {
          code: 1112, 
          data: "neutral_gobblerStar",
          silhouette:""
      }, 
      {
          code: 1113, 
          data: "neutral_griffStar",
          silhouette:""
      }, 
      {
          code: 1114, 
          data: "neutral_karlaStar",
          silhouette:""
      }, 
      {
          code: 1115, 
          data: "neutral_borakStar",
          silhouette:""
      }, 
      {
          code: 1116, 
          data: "neutral_roxannaStar",
          silhouette:""
      }, 
      {
          code: 1117, 
          data: "neutral_varagStar",
          silhouette:""
      }, 
      {
          code: 1118, 
          data: "neutral_grombrindalStar",
          silhouette:""
      }, 
      {
          code: 1119, 
          data: "neutral_morgStar",
          silhouette:""
      }, 
      {
          code: 1120, 
          data: "neutral_glartStar",
          silhouette:""
      }, 
      {
          code: 1121, 
          data: "neutral_helmutStar",
          silhouette:""
      }, 
      {
          code: 1122, 
          data: "neutral_willowStar",
          silhouette:""
      }, 
      {
          code: 1123, 
          data: "neutral_gobboStar",
          silhouette:""
      }, 
      {
          code: 1124, 
          data: "neutral_hakflemStar",
          silhouette:""
      }, 
      {
          code: 1125, 
          data: "neutral_eldrilStar",
          silhouette:""
      }, 
      {
          code: 1126, 
          data: "neutral_ironjawStar",
          silhouette:""
      }, 
      {
          code: 1127, 
          data: "neutral_zugStar",
          silhouette:""
      }, 
      {
          code: 1128, 
          data: "neutral_bugmanStar",
          silhouette:""
      }, 
      {
          code: 1129, 
          data: "neutral_bolgrotStar",
          silhouette:""
      }, 
      {
          code: 1130, 
          data: "neutral_farblastStar",
          silhouette:""
      }, 
      {
          code: 1131, 
          data: "neutral_withergraspStar",
          silhouette:""
      }, 
      {
          code: 1132, 
          data: "neutral_frog",
          silhouette:""
      }, 
      {
          code: 1133, 
          data: "neutral_kreekStar",
          silhouette:""
      }, 
      {
          code: 1134, 
          data: "neutral_kirothStar",
          silhouette:""
      }, 
      {
          code: 1135, 
          data: "neutral_cindyStar",
          silhouette:""
      }, 
      {
          code: 1136, 
          data: "neutral_asperonStar",
          silhouette:""
      }, 
      {
          code: 1137, 
          data: "neutral_heartripperStar",
          silhouette:""
      }, 
      {
          code: 1138, 
          data: "neutral_ivanStar",
          silhouette:""
      }, 
      {
          code: 1139, 
          data: "neutral_curnothStar",
          silhouette:""
      }, 
      {
          code: 1140, 
          data: "neutral_fungusStar",
          silhouette:""
      }, 
      {
          code: 1141, 
          data: "neutral_freshbreezeStar",
          silhouette:""
      }, 
      {
          code: 1142, 
          data: "neutral_anqiStar",
          silhouette:""
      }, 
      {
          code: 1143, 
          data: "neutral_glotlStar",
          silhouette:""
      }, 
      {
          code: 1145, 
          data: "neutral_valenStar",
          silhouette:""
      }, 
      {
          code: 1444, 
          data: "neutral_lucienStar",
          silhouette:""
      }, 
      {
          code: 1445, 
          data: "neutral_bilerotStar",
          silhouette:""
      }, 
      {
          code: 1446, 
          data: "neutral_dribblesnotStar",
          silhouette:""
      }, 
      {
          code: 1447, 
          data: "neutral_puggyStar",
          silhouette:""
      }, 
      {
          code: 1448, 
          data: "neutral_drullStar",
          silhouette:""
      }, 
      {
          code: 1449, 
          data: "neutral_driblStar",
          silhouette:""
      }, 
      {
          code: 1450, 
          data: "neutral_glorielStar",
          silhouette:""
      }, 
      {
          code: 1451, 
          data: "neutral_gretchenStar",
          silhouette:""
      }, 
      {
          code: 1452, 
          data: "neutral_skullHalfheightStar",
          silhouette:""
      }, 
      {
          code: 1453, 
          data: "neutral_bryceTheSliceCambuelStar" ,
          silhouette:""
      }, 
      {
          code: 1454, 
          data: "neutral_madcapMiggzStar" ,
          silhouette:""
      }
    ]

    const position = positions.find(x => x.data == type);

    switch( Number(position.code)) {
    case 1: return "Human Lineman";
    case 2: return "Human Catcher";
    case 3: return "Human Thrower";
    case 4: return "Human Blitzer";
    case 5: return "Ogre";
    case 6: return "Dwarf Blocker";
    case 7: return "Dwarf Runner";
    case 8: return "Dwarf Blitzer";
    case 9: return "Dwarf Troll Slayer";
    case 10: return "Deathroller";
    case 21: return "Orc Lineman";
    case 22: return "Goblin";
    case 23: return "Orc Thrower";
    case 24: return "Big Un Blocker";
    case 25: return "Orc Blitzer";
    case 26: return "Troll";
    case 30: return "Goblin";
    case 31: return "Goblin Looney";
    case 32: return "Beastman Runner";
    case 33: return "Chosen Blocker";
    case 35: return "Norse Raider Lineman";
    case 36: return "Norse Berserker";
    case 37: return "Beer Boar";
    case 38: return "Valkyrie";
    case 39: return "Ulfwerener";
    case 40: return "Yhetee";
    case 44: return "Troll";
    case 45: return "Goblin Pogoer";
    case 46: return "Goblin Fanatic";
    case 47: return "Dark Elf Lineman";
    case 48: return "Dark Elf Runner";
    case 49: return "Dark Elf Assassin";
    case 50: return "Dark Elf Blitzer";
    case 51: return "Dark Elf Witch Elf";
    case 60: return "Halfling Hopeful";
    case 61: return "Treeman";
    case 73: return "Elf Thrower";
    case 75: return "Elf Blitzer";
    case 77: return "Elf Lineman";
    case 79: return "Elf Catcher";
    case 107: return "Goblin Bomma";
    case 1000: return "Black Orc";
    case 1001: return "Goblin Bruiser";
    case 1002: return "Troll";
    case 1006: return "Dark Elf";
    case 1007: return "Goblin";
    case 1008: return "Human Lineman";
    case 1009: return "Human Thrower";
    case 1010: return "Minotaur";
    case 1011: return "Ogre";
    case 1012: return "Orc";
    case 1013: return "Skaven";
    case 1014: return "Troll";
    case 1015: return "Goblin Doom Diver";
    case 1016: return "Goblin Ooligan";
    case 1017: return "Halfling Catcher";
    case 1018: return "Halfling Hefty";
    case 1019: return "Halfling Hopeful";
    case 1020: return "Human Retainer";
    case 1021: return "Human Thrower";
    case 1022: return "Human Noble Blitzer";
    case 1023: return "Human Bodyguard";
    case 1024: return "Ogre";
    case 1029: return "Skink Runner";
    case 1030: return "Skink Chameleon";
    case 1031: return "Saurus Blocker";
    case 1032: return "Kroxigor";
    case 1045: return "Flesh Golem";
    case 1046: return "Ghoul Runner";
    case 1047: return "Werewolf";
    case 1048: return "Wraith";
    case 1049: return "Zombie";
    case 1056: return "Beastman Pestigor";
    case 1057: return "Bloater";
    case 1058: return "Rotspawn";
    case 1059: return "Rotter";
    case 1063: return "Dwarf Blitzer";
    case 1064: return "Dwarf Blocker";
    case 1065: return "Dwarf Runner";
    case 1066: return "Dwarf Troll Slayer";
    case 1067: return "Halfling Hopeful";
    case 1068: return "Human Blitzer";
    case 1069: return "Human Catcher";
    case 1070: return "Human Lineman";
    case 1071: return "Human Thrower";
    case 1072: return "Ogre";
    case 1073: return "Ghoul Runner";
    case 1074: return "Mummy";
    case 1075: return "Skeleton";
    case 1076: return "Wight Blitzer";
    case 1077: return "Zombie";
    case 1078: return "Rat Ogre";
    case 1079: return "Skaven Blitzer";
    case 1080: return "Skaven Gutter Runner";
    case 1081: return "Skaven Lineman";
    case 1082: return "Skaven Thrower";
    case 1090: return "Goblin";
    case 1091: return "Skaven Blitzer";
    case 1092: return "Skaven Gutter Runner";
    case 1093: return "Skaven Lineman";
    case 1094: return "Skaven Thrower";
    case 1095: return "Troll";
    case 1098: return "Treeman";
    case 1099: return "Wood Elf Catcher";
    case 1100: return "Wood Elf Lineman";
    case 1101: return "Wood Elf Thrower";
    case 1102: return "Wood Elf Wardancer";
    case 1103: return "Troll";
    case 1104: return "Ogre";
    case 1105: return "Treeman";
    case 1106: return "Rat Ogre";
    case 1107: return "Rat Ogre";
    case 1108: return "Snotling";
    case 1112: return "Gobbler";
    case 1113: return "Griff";
    case 1114: return "Karla";
    case 1115: return "Borak";
    case 1116: return "Roxanna";
    case 1117: return "Varag";
    case 1118: return "Grombrindal";
    case 1119: return "Morg";
    case 1120: return "Glart";
    case 1121: return "Helmut";
    case 1122: return "Willow";
    case 1123: return "Gobbo";
    case 1124: return "Hakflem";
    case 1125: return "Eldril";
    case 1126: return "Ironjaw";
    case 1127: return "Zug";
    case 1128: return "Bugman";
    case 1129: return "Bolgrot";
    case 1130: return "Farblast";
    case 1131: return "Withergrasp";
    case 1132: return "Frog";
    case 1133: return "Kreek";
    case 1134: return "Kiroth";
    case 1135: return "Cindy";
    case 1136: return "Asperon";
    case 1137: return "Heartripper";
    case 1138: return "Ivan";
    case 1139: return "Curnoth";
    case 1140: return "Fungus";
    case 1141: return "Freshbreeze";
    case 1142: return "Anqi";
    case 1143: return "Glotl";
    case 1145: return "Valen";
    case 1444: return "Lucien";
    case 1445: return "Bilerot";
    case 1446: return "Dribblesnot";
    case 1447: return "Puggy";
    case 1448: return "Drull";
    case 1449: return "Dribl";
    case 1450: return "Gloriel";
    case 1451: return "Gretchen";
    case 1452: return "Skull Halfheight";
    case 1453: return "Bryce The Slice Cambuel";
    case 1454: return "Madcap Miggz";
  }
  }
}



module.exports = new BB3MatchReport();