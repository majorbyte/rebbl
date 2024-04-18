"use strict";
const adminService = require("./adminBB3Service.js");
const bb3Service = require("./bb3Service.js");
const cyanideService = require("./CyanideService.js");
const diceService = require("./diceService.js");
const dataService = require("./DataServiceBB3.js").rebbl3;


class ConcedeMatchService{


  async resetMatch(matchId){
    const schedule = await dataService.getSchedule({matchId:matchId});

    await adminService.resetMatch(null, schedule.competitionId, matchId);

    await dataService.updateSchedule({matchId:matchId},{$set:{ "home.score": 0, "away.score": 0, status:1 }});
  }

  async concedeMatch(matchId, winningTeamId){
    const schedule = await dataService.getSchedule({matchId:matchId});
    
    if (schedule.handlingByeWeek) throw(`This match (${matchId}) is alread (being) processed`);

    await dataService.updateSchedule({matchId:matchId},{$set:{handlingByeWeek:true}});

    // update teams
    await bb3Service.getTeams([schedule.home.team.id, schedule.away.team.id]);
    
    const homeTeam = await dataService.getTeam({id:schedule.home.team.id});
    const awayTeam = await dataService.getTeam({id:schedule.away.team.id});

    const competition = await dataService.getCompetition({id:schedule.competitionId});

    const homeDF = Number(homeTeam.improvements.find(x => x.improvement === "5").quantity);
    const awayDF = Number(awayTeam.improvements.find(x => x.improvement === "5").quantity);

    let cookie = null;
    let homeWinnings = {treasury: homeTeam.treasury, winnings:0,fans:homeDF, fansRoll:0, score:0};
    let awayWinnings = {treasury: awayTeam.treasury, winnings:0,fans:awayDF, fansRoll:0, score:0};

    if (winningTeamId == homeTeam.id) {
      cookie = await adminService.setTeamToAdmin(cookie, competition.id, homeTeam.id);
      await this.#awardByeWeekSpp(cookie, homeTeam);
      homeWinnings = await this.#awardByeWeekCash(cookie, homeTeam, awayDF);
      homeWinnings.score = 1;
    } else {
      cookie = await adminService.setTeamToAdmin(cookie, competition.id, awayTeam.id);
      await this.#awardByeWeekSpp(cookie, awayTeam);
      awayWinnings = await this.#awardByeWeekCash(cookie, awayTeam, homeDF);
      awayWinnings.score = 1;
    }

    const gameId = await this.#createMatch(competition, schedule, homeTeam, awayTeam, homeWinnings, awayWinnings);

    // update schedule
    await adminService.adminMatch(cookie, schedule.competitionId, matchId, homeWinnings.score,awayWinnings.score);
    await dataService.updateSchedule({matchId:matchId},{$set:{
      status: 3,
      gameId: gameId,
      "home.score": homeWinnings.score,
      "away.score": awayWinnings.score
    }});

    if (winningTeamId == homeTeam.id) {
      await this.#clearMissingNextGame(cookie, homeTeam);
      await adminService.setTeamToAdmin(cookie, competition.id, awayTeam.id);
      await this.#clearMissingNextGame(cookie, awayTeam);
    } else {
      await this.#clearMissingNextGame(cookie, awayTeam);
      await adminService.setTeamToAdmin(cookie, competition.id, homeTeam.id);
      await this.#clearMissingNextGame(cookie, homeTeam);
    }
  }

  async adminMatch(matchId, winningTeamId, type){
    const schedule = await dataService.getSchedule({matchId:matchId});
    
    if (schedule.handlingByeWeek) throw(`This match (${matchId}) is alread (being) processed`);

    await dataService.updateSchedule({matchId:matchId},{$set:{handlingByeWeek:true}});

    // update teams
    await bb3Service.getTeams([schedule.home.team.id, schedule.away.team.id]);
    
    const homeTeam = await dataService.getTeam({id:schedule.home.team.id});
    const awayTeam = await dataService.getTeam({id:schedule.away.team.id});

    const competition = await dataService.getCompetition({id:schedule.competitionId});

    // dedicated fans == improvement 5
    const homeDF = Number(homeTeam.improvements.find(x => x.improvement === "5").quantity);
    const awayDF = Number(awayTeam.improvements.find(x => x.improvement === "5").quantity);
    const [d1,d2] = await Promise.all([diceService.roll(3),diceService.roll(3)]);

    let cookie = null;
    let homeWinnings = {treasury: homeTeam.treasury, winnings:0,fans:homeDF+d1, fansRoll:0, score:winningTeamId == homeTeam.id ? 2 : 1};
    let awayWinnings = {treasury: awayTeam.treasury, winnings:0,fans:awayDF+d2, fansRoll:0, score:winningTeamId == awayTeam.id ? 2 : 1};

    let fanAttendance = (homeWinnings.fans + awayWinnings.fans)/2;

    homeWinnings.winnings = fanAttendance * 10_000 + homeWinnings.score * 10_000;
    awayWinnings.winnings = fanAttendance * 10_000 + awayWinnings.score * 10_000;
    let newTreasury = Number(homeTeam.treasury) + homeWinnings.winnings;


    cookie = await adminService.setTeamToAdmin(cookie, competition.id, homeTeam.id);
    await this.#awardSpp(cookie, homeTeam, homeWinnings.score);
    await adminService.awardCash(cookie, newTreasury);


    cookie = await adminService.setTeamToAdmin(cookie, competition.id, awayTeam.id);
    await this.#awardSpp(cookie, awayTeam, awayWinnings.score);
    newTreasury = Number(awayTeam.treasury) + awayWinnings.winnings;
    await adminService.awardCash(cookie, newTreasury);

    const gameId = await this.#createMatch(competition, schedule, homeTeam, awayTeam, homeWinnings, awayWinnings);

    // update schedule
    await adminService.adminMatch(cookie, schedule.competitionId, matchId, homeWinnings.score,awayWinnings.score);
    await dataService.updateSchedule({matchId:matchId},{$set:{
      status: 3,
      gameId: gameId,
      "home.score": homeWinnings.score,
      "away.score": awayWinnings.score
    }});

    if (winningTeamId == homeTeam.id) {
      await this.#clearMissingNextGame(cookie, homeTeam);
      await adminService.setTeamToAdmin(cookie, competition.id, awayTeam.id);
      await this.#clearMissingNextGame(cookie, awayTeam);
    } else {
      await this.#clearMissingNextGame(cookie, awayTeam);
      await adminService.setTeamToAdmin(cookie, competition.id, homeTeam.id);
      await this.#clearMissingNextGame(cookie, homeTeam);
    }
  }



  async #awardByeWeekSpp(cookie, team){
    // 2 MVP
    // 1 TD

    const viablePlayers = team.roster.filter(x => x.player.missNextGame === "0").map(x => x.player);

    let td = await diceService.roll(viablePlayers.length);
    let mvp1 = await diceService.roll(viablePlayers.length);
    let mvp2 = await diceService.roll(viablePlayers.length);
    while (mvp1 === mvp2){
      mvp2 = await diceService.roll(viablePlayers.length);
    }

    viablePlayers[td-1].spp = Number(viablePlayers[td-1].spp) + 3;
    viablePlayers[td-1].stats = {touchdowns_scored : 1};
    viablePlayers[mvp1-1].spp = Number(viablePlayers[mvp1-1].spp) + 4;
    viablePlayers[mvp1-1].mvp = true;
    viablePlayers[mvp2-1].spp = Number(viablePlayers[mvp2-1].spp) + 4;
    viablePlayers[mvp2-1].mvp = true;

    for(const player of team.roster)
      player.player.xpGained =0;

    team.roster.find(x => x.player.id === viablePlayers[td-1].id).player.xpGained += 3;
    team.roster.find(x => x.player.id === viablePlayers[mvp1-1].id).player.xpGained += 4;
    team.roster.find(x => x.player.id === viablePlayers[mvp2-1].id).player.xpGained += 4;

    team.roster.find(x => x.player.id === viablePlayers[mvp1-1].id).player.mvp = true;
    team.roster.find(x => x.player.id === viablePlayers[mvp2-1].id).player.mvp = true;

    return await adminService.assingSpp(cookie, [viablePlayers[td-1],viablePlayers[mvp1-1],viablePlayers[mvp2-1]]);
  }

  async #awardSpp(cookie, team, numberOfTouchdowns){
    // 1 MVP
    // 1 TD

    const viablePlayers = team.roster.filter(x => x.player.missNextGame === "0").map(x => x.player);
    const sppPlayers = [];

    for(const player of team.roster)
      player.player.xpGained =0;

    
    let mvp = await diceService.roll(viablePlayers.length);
    viablePlayers[mvp-1].spp = Number(viablePlayers[mvp-1].spp) + 4;
    viablePlayers[mvp-1].mvp = true;
    team.roster.find(x => x.player.id === viablePlayers[mvp-1].id).player.xpGained += 4;
    team.roster.find(x => x.player.id === viablePlayers[mvp-1].id).player.mvp = true;
    sppPlayers.push(viablePlayers[mvp-1]);


    while(numberOfTouchdowns>0){
      let td = await diceService.roll(viablePlayers.length);
      viablePlayers[td-1].spp = Number(viablePlayers[td-1].spp) + 3;
      viablePlayers[td-1].stats = {touchdowns_scored : 1};
  
      team.roster.find(x => x.player.id === viablePlayers[td-1].id).player.xpGained += 3;
      
      numberOfTouchdowns--;
    }

    return await adminService.assingSpp(cookie, sppPlayers);
  }

  async #awardByeWeekCash(cookie, team, otherDedicatedFans){
    // dedicated fans == improvement 5
    const dedicatedFans = Number(team.improvements.find(x => x.improvement === "5").quantity);

    const [d1,d2] = await Promise.all([diceService.roll(3),diceService.roll(3)]);

    const winnings = (1 + d1 +d2 + dedicatedFans + otherDedicatedFans) * 10_000;
    const newTreasury = Number(team.treasury) + winnings

    await adminService.awardCash(cookie, newTreasury);
    return {treasury: Number(team.treasury), winnings,fans:dedicatedFans, fansRoll:d1+d2};
  }


  async #clearMissingNextGame(cookie, team){
    const viablePlayers = team.roster.filter(x => x.missNextGame === "1");

    await adminService.clearMng(cookie, viablePlayers);
  }

  async #createMatch(competition, schedule, homeTeam, awayTeam, homeWinnings, awayWinnings){
    delete competition.standings;

    const _homeTeam = await cyanideService.team({bb:3, team: homeTeam.id});
    const _awayTeam = await cyanideService.team({bb:3, team: awayTeam.id});

    for(const player of _homeTeam.roster){
      const p = homeTeam.roster.find(x => x.player.id == player.id);
      player.xp_gain = p.player.xpGained;
      player.mvp = p.player.mvp;
      if (p.player.stats) player.stats = p.player.stats;
    }
    for(const player of _awayTeam.roster){
      const p = awayTeam.roster.find(x => x.player.id == player.id);
      player.xp_gain = p.player.xpGained;
      player.mvp = p.player.mvp;
      if (p.player.stats) player.stats = p.player.stats;
    }



    homeTeam.logo.icon = this.#getCyanideLogo(_homeTeam.team.logo) + '.png';
    awayTeam.logo.icon = this.#getCyanideLogo(_awayTeam.team.logo) + '.png';

    homeTeam.roster = this.#parseRoster(_homeTeam.roster);
    awayTeam.roster = this.#parseRoster(_awayTeam.roster);

    //if (homeTeam.roster[0].player) homeTeam.roster = homeTeam.roster.map(x => x.player);
    //if (awayTeam.roster[0].player) awayTeam.roster = awayTeam.roster.map(x => x.player);

    const match ={
      homeGamer: schedule.home.coach,
      awayGamer:schedule.away.coach,
      competition:competition,
      homeMvp:{},
      awayMvp:{},
      homeHasConceded:`${homeWinnings.score == 1 ? "0" : "1"}`,
      awayHasConceded:`${homeWinnings.score == 1 ? "1" : "0"}`,
      homeGameResultGain:this.#resultGain(homeWinnings.treasury, homeWinnings.winnings, homeWinnings.fans, homeWinnings.fansRoll),
      awayGameResultGain:this.#resultGain(awayWinnings.treasury, awayWinnings.winnings, awayWinnings.fans, awayWinnings.fansRoll),
      homeTeam:homeTeam,
      awayTeam:awayTeam,
      homeScore:`${homeWinnings.score}`,
      awayScore:`${awayWinnings.score}`,
      statistics:{},
      gameId:crypto.randomUUID(),
      matchId:schedule.matchId,
      hasReplay:"0",
      reported:true,
      validated:true,
    }

    await dataService.insertMatch(match);
    return match.gameId;
  }

  #resultGain(treasury, winnings, fans, fansRoll){
    return {
      "newTreasury" : `${treasury + winnings}`,
      "newDedicatedFans" : `${fans}`,
      "previousTreasury" : `${treasury}`,
      "dedicatedFansRoll" : `${fansRoll}`,
      "fanAttendance" : `${fans+fansRoll}`,
      "previousDedicatedFans" : `${fans}`,
      "cashSpentDuringMatch" : "0"
    };
  }

  #getCyanideLogo = logo => logo.replace("Neutral", "Neutre").replace("ChaosChosen", "Chaos");

  #parseRoster = (roster) => roster.map(this.#mapPlayer.bind(this));
  
  #mapPlayer = (player) => {
      return {
        id: player.id,
        name: player.name,
        number: player.number,
        type: player.type,
        mvp: player.mvp,
        level: player.level,
        xp: player.xp,
        xpGained: player.xp_gain,
        matchPlayed: player.matchplayed,
        attributes: player.attributes,
        attributesEx: player.attributes_ex,
        stats: player.stats,
        skills: this.#mapSkills(player.skills).filter(x => x !== null),
        casualties: []
      }
    }
  
  #mapSkills = skills => skills.map(this.#mapSkill.bind(this));
  
  #mapSkill = skill => {
    skill = skill.replace("+","").replace("(","").replace(")","").replace("-"," ").trim().replace(/(^\w|\s\w)/g, m => m.toUpperCase()).replace(/ /g,"");

    const result = this.#skills.find(x => x.name == skill);
    if (!result) {
      console.log(`skill ${skill} not found.`)    
      return null;
    }
    return result.id
  }

  #skills = [{"id" : 1,"name" : "StripBall","icon" : "StripBall.png"}, {"id" : 6,"name" : "Catch","icon" : "Catch.png"}, {"id" : 7,"name" : "Dodge","icon" : "Dodge.png"}, {"id" : 8,"name" : "Sprint","icon" : "Sprint.png"}, {"id" : 10,"name" : "FoulAppearance","icon" : "FoulAppearance.png"}, {"id" : 100,"name" : "AnimosityOrcLinemen","icon" : "Animosity.png"}, {"id" : 1001,"name" : "BloodGreed","icon" : "BloodGreed.png"}, {"id" : 1005,"name" : "Fumblerooskie","icon" : "Fumblerooskie.png"}, {"id" : 1007,"name" : "KickTeamMate","icon" : "KickTeamMate.png"}, {"id" : 1008,"name" : "Loner3","icon" : "Loner3.png"}, {"id" : 1009,"name" : "MightyBlow2","icon" : "MightyBlow.png"}, {"id" : 101,"name" : "AnimosityBigUnBlockers","icon" : "Animosity.png"}, {"id" : 1010,"name" : "MonstrousMouth","icon" : "MonstrousMouth.png"}, {"id" : 1012,"name" : "PileDriver","icon" : "PileDriver.png"}, {"id" : 1015,"name" : "SafePairOfHands","icon" : "SafePairOfHands.png"}, {"id" : 1016,"name" : "Swarming","icon" : "Swarming.png"}, {"id" : 1017,"name" : "Swoop","icon" : "Swoop.png"}, {"id" : 1018,"name" : "Loner2","icon" : "Loner.png"}, {"id" : 102,"name" : "AnimosityUnderworldGoblinLinemen","icon" : "Animosity.png"}, {"id" : 1020,"name" : "PlagueRidden","icon" : "PlagueRidden.png"}, {"id" : 1021,"name" : "DirtyPlayer2","icon" : "DirtyPlayer.png"}, {"id" : 1022,"name" : "Loner5","icon" : "Loner.png"}, {"id" : 11,"name" : "Leap","icon" : "Leap.png"}, {"id" : 12,"name" : "ExtraArms","icon" : "ExtraArms.png"}, {"id" : 13,"name" : "MightyBlow1","icon" : "MightyBlow.png"}, {"id" : 14,"name" : "Leader","icon" : "Leader.png"}, {"id" : 15,"name" : "Horns","icon" : "Horns.png"}, {"id" : 16,"name" : "TwoHeads","icon" : "TwoHeads.png"}, {"id" : 17,"name" : "StandFirm","icon" : "StandFirm.png"}, {"id" : 18,"name" : "AlwaysHungry","icon" : "AlwaysHungry.png"}, {"id" : 19,"name" : "Regeneration","icon" : "Regeneration.png"}, {"id" : 20,"name" : "TakeRoot","icon" : "TakeRoot.png"}, {"id" : 21,"name" : "Accurate","icon" : "Accurate.png"}, {"id" : 22,"name" : "BreakTackle","icon" : "BreakTackle.png"}, {"id" : 23,"name" : "SneakyGit","icon" : "SneakyGit.png"}, {"id" : 25,"name" : "Chainsaw","icon" : "Chainsaw.png"}, {"id" : 26,"name" : "Dauntless","icon" : "Dauntless.png"}, {"id" : 27,"name" : "DirtyPlayer1","icon" : "DirtyPlayer.png"}, {"id" : 28,"name" : "DivingCatch","icon" : "DivingCatch.png"}, {"id" : 29,"name" : "Dumpoff","icon" : "Dumpoff.png"}, {"id" : 30,"name" : "Block","icon" : "Block.png"}, {"id" : 31,"name" : "BoneHead","icon" : "BoneHead.png"}, {"id" : 32,"name" : "VeryLongLegs","icon" : "VeryLongLegs.png"}, {"id" : 33,"name" : "DisturbingPresence","icon" : "DisturbingPresence.png"}, {"id" : 34,"name" : "DivingTackle","icon" : "DivingTackle.png"}, {"id" : 35,"name" : "Fend","icon" : "Fend.png"}, {"id" : 36,"name" : "Frenzy","icon" : "Frenzy.png"}, {"id" : 37,"name" : "Grab","icon" : "Grab.png"}, {"id" : 38,"name" : "Guard","icon" : "Guard.png"}, {"id" : 39,"name" : "HailMaryPass","icon" : "HailMaryPass.png"}, {"id" : 40,"name" : "Juggernaut","icon" : "Juggernaut.png"}, {"id" : 41,"name" : "JumpUp","icon" : "JumpUp.png"}, {"id" : 44,"name" : "Loner4","icon" : "Loner.png"}, {"id" : 45,"name" : "NervesOfSteel","icon" : "NervesOfSteel.png"}, {"id" : 46,"name" : "NoHands","icon" : "NoHands.png"}, {"id" : 47,"name" : "Pass","icon" : "Pass.png"}, {"id" : 49,"name" : "PrehensileTail","icon" : "PrehensileTail.png"}, {"id" : 50,"name" : "Pro","icon" : "Pro.png"}, {"id" : 51,"name" : "ReallyStupid","icon" : "ReallyStupid.png"}, {"id" : 52,"name" : "RightStuff","icon" : "RightStuff.png"}, {"id" : 53,"name" : "SafePass","icon" : "SafePass.png"}, {"id" : 54,"name" : "SecretWeapon","icon" : "SecretWeapon.png"}, {"id" : 55,"name" : "Shadowing","icon" : "Shadowing.png"}, {"id" : 56,"name" : "Sidestep","icon" : "Sidestep.png"}, {"id" : 57,"name" : "Tackle","icon" : "Tackle.png"}, {"id" : 58,"name" : "StrongArm","icon" : "StrongArm.png"}, {"id" : 59,"name" : "Stunty","icon" : "Stunty.png"}, {"id" : 60,"name" : "SureFeet","icon" : "SureFeet.png"}, {"id" : 61,"name" : "SureHands","icon" : "SureHands.png"}, {"id" : 63,"name" : "ThickSkull","icon" : "ThickSkull.png"}, {"id" : 64,"name" : "ThrowTeamMate","icon" : "ThrowTeamMate.png"}, {"id" : 67,"name" : "UnchannelledFury","icon" : "UnchannelledFury.png"}, {"id" : 68,"name" : "Wrestle","icon" : "Wrestle.png"}, {"id" : 69,"name" : "Tentacles","icon" : "Tentacles.png"}, {"id" : 70,"name" : "MultipleBlock","icon" : "MultipleBlock.png"}, {"id" : 71,"name" : "Kick","icon" : "Kick.png"}, {"id" : 74,"name" : "BigHand","icon" : "BigHand.png"}, {"id" : 75,"name" : "Claws","icon" : "Claws.png"}, {"id" : 76,"name" : "BallAndChain","icon" : "BallAndChain.png"}, {"id" : 77,"name" : "Stab","icon" : "Stab.png"}, {"id" : 78,"name" : "HypnoticGaze","icon" : "HypnoticGaze.png"}, {"id" : 80,"name" : "Bombardier","icon" : "Bombardier.png"}, {"id" : 81,"name" : "Decay","icon" : "Decay.png"}, {"id" : 83,"name" : "Titchy","icon" : "Titchy.png"}, {"id" : 84,"name" : "AnimalSavagery","icon" : "AnimalSavagery.png"}, {"id" : 86,"name" : "AnimosityAllTeamMates","icon" : "Animosity.png"}, {"id" : 87,"name" : "TimmmBer","icon" : "TimmmBer.png"}, {"id" : 88,"name" : "Cannoneer","icon" : "Cannoneer.png"}, {"id" : 89,"name" : "PogoStick","icon" : "PogoStick.png"}, {"id" : 90,"name" : "Defensive","icon" : "Defensive.png"}, {"id" : 91,"name" : "ArmBar","icon" : "ArmBar.png"}, {"id" : 92,"name" : "IronHardSkin","icon" : "IronHardSkin.png"}, {"id" : 93,"name" : "RunningPass","icon" : "RunningPass.png"}, {"id" : 94,"name" : "CloudBurster","icon" : "CloudBurster.png"}, {"id" : 95,"name" : "ProjectileVomit","icon" : "ProjectileVomit.png"}, {"id" : 96,"name" : "Brawler","icon" : "Brawler.png"}, {"id" : 97,"name" : "OnTheBall","icon" : "OnTheBall.png"}, {"id" : 98,"name" : "AnimosityAllDwarfAndHalflingTeamMates","icon" : "Animosity.png"}, {"id" : 99,"name" : "AnimosityAllDwarfAndHumanTeamMates","icon" : "Animosity.png"}];
}


module.exports = new ConcedeMatchService();
