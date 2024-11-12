
'use strict';
const express = require('express');

class BloodbowlApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }
  routesConfig(){
    
    this.router.get("/skills", async function(req,res){
        return res.json([
          {id:1, name: "StripBall", icon:"StripBall.png"},
          {id:6, name: "Catch", icon:"Catch.png"},
          {id:7, name: "Dodge", icon:"Dodge.png"},
          {id:8, name: "Sprint", icon:"Sprint.png"},
          {id:10, name: "FoulAppearance", icon:"FoulAppearance.png"},
          {id:100, name: "AnimosityOrcLinemen", icon:"Animosity.png"},
          {id:1001, name: "BloodGreed", icon:"BloodGreed.png"},
          {id:1005, name: "Fumblerooskie", icon:"Fumblerooskie.png"},
          {id:1007, name: "KickTeamMate", icon:"KickTeamMate.png"},
          {id:1008, name: "Loner3", icon:"Loner.png"},
          {id:1009, name: "MightyBlow2", icon:"MightyBlow.png"},
          {id:101, name: "AnimosityBigUnBlockers", icon:"Animosity.png"},
          {id:1010, name: "MonstrousMouth", icon:"MonstrousMouth.png"},
          {id:1012, name: "PileDriver", icon:"PileDriver.png"},
          {id:1015, name: "SafePairOfHands", icon:"SafePairOfHands.png"},
          {id:1016, name: "Swarming", icon:"Swarming.png"},
          {id:1017, name: "Swoop", icon:"Swoop.png"},
          {id:1018, name: "Loner2", icon:"Loner.png"},
          {id:102, name: "AnimosityUnderworldGoblinLinemen", icon:"Animosity.png"},
          {id:1020, name: "PlagueRidden", icon:"PlagueRidden.png"},
          {id:1021, name: "DirtyPlayer2", icon:"DirtyPlayer.png"},
          {id:1022, name: "Loner5", icon:"Loner.png"},
          {id:11, name: "Leap", icon:"Leap.png"},
          {id:12, name: "ExtraArms", icon:"ExtraArms.png"},
          {id:13, name: "MightyBlow1", icon:"MightyBlow.png"},
          {id:14, name: "Leader", icon:"Leader.png"},
          {id:15, name: "Horns", icon:"Horns.png"},
          {id:16, name: "TwoHeads", icon:"TwoHeads.png"},
          {id:17, name: "StandFirm", icon:"StandFirm.png"},
          {id:18, name: "AlwaysHungry", icon:"AlwaysHungry.png"},
          {id:19, name: "Regeneration", icon:"Regeneration.png"},
          {id:20, name: "TakeRoot", icon:"TakeRoot.png"},
          {id:21, name: "Accurate", icon:"Accurate.png"},
          {id:22, name: "BreakTackle", icon:"BreakTackle.png"},
          {id:23, name: "SneakyGit", icon:"SneakyGit.png"},
          {id:25, name: "Chainsaw", icon:"Chainsaw.png"},
          {id:26, name: "Dauntless", icon:"Dauntless.png"},
          {id:27, name: "DirtyPlayer1", icon:"DirtyPlayer.png"},
          {id:28, name: "DivingCatch", icon:"DivingCatch.png"},
          {id:29, name: "Dumpoff", icon:"DumpOff.png"},
          {id:30, name: "Block", icon:"Block.png"},
          {id:31, name: "BoneHead", icon:"BoneHead.png"},
          {id:32, name: "VeryLongLegs", icon:"VeryLongLegs.png"},
          {id:33, name: "DisturbingPresence", icon:"DisturbingPresence.png"},
          {id:34, name: "DivingTackle", icon:"DivingTackle.png"},
          {id:35, name: "Fend", icon:"Fend.png"},
          {id:36, name: "Frenzy", icon:"Frenzy.png"},
          {id:37, name: "Grab", icon:"Grab.png"},
          {id:38, name: "Guard", icon:"Guard.png"},
          {id:39, name: "HailMaryPass", icon:"HailMaryPass.png"},
          {id:40, name: "Juggernaut", icon:"Juggernaut.png"},
          {id:41, name: "JumpUp", icon:"JumpUp.png"},
          {id:44, name: "Loner4", icon:"Loner.png"},
          {id:45, name: "NervesOfSteel", icon:"NervesOfSteel.png"},
          {id:46, name: "NoHands", icon:"NoHands.png"},
          {id:47, name: "Pass", icon:"Pass.png"},
          {id:49, name: "PrehensileTail", icon:"PrehensileTail.png"},
          {id:50, name: "Pro", icon:"Pro.png"},
          {id:51, name: "ReallyStupid", icon:"ReallyStupid.png"},
          {id:52, name: "RightStuff", icon:"RightStuff.png"},
          {id:53, name: "SafePass", icon:"SafePass.png"},
          {id:54, name: "SecretWeapon", icon:"SecretWeapon.png"},
          {id:55, name: "Shadowing", icon:"Shadowing.png"},
          {id:56, name: "Sidestep", icon:"SideStep.png"},
          {id:57, name: "Tackle", icon:"Tackle.png"},
          {id:58, name: "StrongArm", icon:"StrongArm.png"},
          {id:59, name: "Stunty", icon:"Stunty.png"},
          {id:60, name: "SureFeet", icon:"SureFeet.png"},
          {id:61, name: "SureHands", icon:"SureHands.png"},
          {id:63, name: "ThickSkull", icon:"ThickSkull.png"},
          {id:64, name: "ThrowTeamMate", icon:"ThrowTeamMate.png"},
          {id:67, name: "UnchannelledFury", icon:"UnchannelledFury.png"},
          {id:68, name: "Wrestle", icon:"Wrestle.png"},
          {id:69, name: "Tentacles", icon:"Tentacles.png"},
          {id:70, name: "MultipleBlock", icon:"MultipleBlock.png"},
          {id:71, name: "Kick", icon:"Kick.png"},
          {id:74, name: "BigHand", icon:"BigHand.png"},
          {id:75, name: "Claws", icon:"Claw.png"},
          {id:76, name: "BallAndChain", icon:"BallAndChain.png"},
          {id:77, name: "Stab", icon:"Stab.png"},
          {id:78, name: "HypnoticGaze", icon:"HypnoticGaze.png"},
          {id:80, name: "Bombardier", icon:"Bombardier.png"},
          {id:81, name: "Decay", icon:"Decay.png"},
          {id:83, name: "Titchy", icon:"Titchy.png"},
          {id:84, name: "AnimalSavagery", icon:"AnimalSavagery.png"},
          {id:86, name: "AnimosityAllTeamMates", icon:"Animosity.png"},
          {id:87, name: "TimmmBer", icon:"Timmm-ber.png"},
          {id:88, name: "Cannoneer", icon:"Cannoneer.png"},
          {id:89, name: "PogoStick", icon:"PogoStick.png"},
          {id:90, name: "Defensive", icon:"Defensive.png"},
          {id:91, name: "ArmBar", icon:"ArmBar.png"},
          {id:92, name: "IronHardSkin", icon:"IronHardSkin.png"},
          {id:93, name: "RunningPass", icon:"RunningPass.png"},
          {id:94, name: "CloudBuster", icon:"CloudBuster.png"},
          {id:95, name: "ProjectileVomit", icon:"ProjectileVomit.png"},
          {id:96, name: "Brawler", icon:"Brawler.png"},
          {id:97, name: "OnTheBall", icon:"OnTheBall.png"},
          {id:98, name: "AnimosityAllDwarfAndHalflingTeamMates", icon:"Animosity.png"},
          {id:99, name: "AnimosityAllDwarfAndHumanTeamMates", icon:"Animosity.png"}]);
    
    });

    return this.router;
  }
}  






module.exports = BloodbowlApi;