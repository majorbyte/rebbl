"use strict";
const axios = require("axios"),
dataService = require("./DataServiceBB3.js").rebbl3;


class BB3MatchReport{
  constructor(){}

  matchReport = async function(uuid, hookUrl){
  
    const match = await dataService.getMatch({matchId:uuid});  
    if (!match)return;
    if (match.reported) return;
  
    let embed = {
      "title": `${match.homeGamer.name} vs ${match.awayGamer.name}`,
      "url":`https://rebbl.net/bb3/match/${match.matchId}`,
      "description":`[${match.homeTeam.name}](https://rebbl.net/bb3/team/${match.homeTeam.id}) vs. [${match.awayTeam.name}](https://rebbl.net/bb3/team/${match.awayTeam.id})
      [${match.competition.name}](https://rebbl.net/bb3)
      `,
      "color": 187908,
      "thumbnail": {
        "url": this.getLogo(match)
      }/*,
      "author": {
        "name": "Griff Oberwald",
        "icon_url": "https://cdn.rebbl.net/images/logo/256x256/logo_human_18.png"
      }*/,
      "fields": [
        {
          "name": "**gamestats**",
          "value": this.getStats(match.statistics),
          "inline": true
        },
        {
          "name": "**injuries home**",
          "value": this.getInjuries(match.spp.homeTeamSppResult.playerSppResults.playerSppResult, match.homeTeam.name),
          "inline": true
        },
        {
          "name": "**injuries away**",
          "value": this.getInjuries(match.spp.awayTeamSppResult.playerSppResults.playerSppResult, match.awayTeam.name),
          "inline": true
        }
      ]
    };  
    const data = {
      embeds: [ embed ]
    };
    axios.post(hookUrl, JSON.stringify(data),{headers:{"Content-Type": "application/json"}})
    .then(async _ => {
      await dataService.updateMatch({matchId:uuid},{$set:{reported:true}});
    })
    .catch(error => {
      console.log(error.response);
    });
  
  }
  
  getStats = function(statistics){
    return `\`\`\`python
    home away
TD    ${this.getStatistic(statistics,18)}     
Blk   ${this.getStatistic(statistics,26)}
AVBr  ${this.getStatistic(statistics,61)}
KO    ${this.getStatistic(statistics,25)}
Cas+  ${this.getStatistic(statistics,19)}
Cas-  ${this.getStatistic(statistics,28)}
Kills ${this.getStatistic(statistics,21)}
Death ${this.getStatistic(statistics,31)}
  \`\`\`
     `  
  }

  getStatistic = function(stats, id){
    if (!Array.isArray(stats.homeGamerStatistics.teamStatistics.statistics.statistic)) stats.homeGamerStatistics.teamStatistics.statistics.statistic = [stats.homeGamerStatistics.teamStatistics.statistics.statistic];
    if (!Array.isArray(stats.awayGamerStatistics.teamStatistics.statistics.statistic)) stats.awayGamerStatistics.teamStatistics.statistics.statistic = [stats.awayGamerStatistics.teamStatistics.statistics.statistic];
    const home = stats.homeGamerStatistics.teamStatistics.statistics.statistic?.find(x => Number(x?.id) == id);
    const away = stats.awayGamerStatistics.teamStatistics.statistics.statistic?.find(x => Number(x?.id) == id);
    return `${home?.value.padStart(2, ' ') || " 0"}  ${away?.value.padStart(2, ' ') || " 0"}`
  }

  getInjuries = function(players,teamName){
    if (!Array.isArray(players)) players = [players];
    let deadPlayers = players.filter(x => x.player.dead == "1").map(x => x.player);
    let mngPlayers = players.filter(x => x.player.missNextGame == "1").map(x => x.player);
    let text = `__**${teamName}**__
    ${deadPlayers.length > 0 ? deadPlayers.map(this.getPlayerText).join('\n')+'\n' : ''}${mngPlayers.map(this.getPlayerText).join('\n')}`;
  
    return text;
  }  

  getLogo = match => match.homeScore > match.awayScore 
    ? `https://cdn.rebbl.net/images/bb3/Logos/${match.homeTeam.logo.icon}`
    : match.homeScore < match.awayScore 
      ? `https://cdn.rebbl.net/images/bb3/Logos/${match.awayTeam.logo.icon}`
      :"https://cdn.rebbl.net/images/cards/fans_small.png";
  

  getPlayerText = player => `${player.name } 
  *${this.getPosition(player.position)}*
  **${this.getCasualties(player.casualties)}** 
  (${player.spp} SPP)
  `;


  getCasualties = function(casualties){
    switch(casualties.casualtiesItem){
      case '2': return "seriously hurt";
      case '3': return "serious injury";
      case '4': return "lasting injury";
      case '5': return "smashed knee";
      case '6': return "head injury";
      case '7': return "broken arm";
      case '8': return "neck injury";
      case '9': return "dislocated shoulder";
      case '10': return "dead";
    }
    return "mng";
  }

  getPosition = function(position){

    switch( Number(position)) {
    case 1: return "Human Lineman";
    case 2: return "Human Catcher";
    case 3: return "Human Thrower";
    case 4: return "Human Blitzer";
    case 5: return "Ogre";
    case 6: return "Dwarf Blocker";
    case 7: return "Dwarf Runner";
    case 8: return "Dwarf Blitzer";
    case 9: return "Dwarf Troll Slayer";
    case 10: return " Deathroller";
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
    case 34: return "Minotaur";
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
  }
  }
}



module.exports = new BB3MatchReport();