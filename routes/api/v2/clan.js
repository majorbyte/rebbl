'use strict';
const express = require('express')
  , accountService = require("../../../lib/accountService.js")
  , cyanideService = require("../../../lib/CyanideService.js")
  , clanService = require("../../../lib/ClanService.js")
  , dataService = require("../../../lib/DataService.js").rebbl
  , draftApi = require("./draft.js")
  , util = require('../../../lib/util.js')
  , multer = require('multer')
  , inMemoryStorage = multer.memoryStorage()
  , uploadStrategy = multer({ storage: inMemoryStorage }).single('image')

  , azureStorage = require('azure-storage')
  , blobService = azureStorage.createBlobService(process.env.storage)

  , getStream = require('into-stream')
  , containerName = 'rebbl';

class ClanApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
    this.getBlobName = (originalName) => `images/clanlogos/${originalName}`;

  }

  routesConfig(){
    this.router.get("/", util.ensureAuthenticated, async function(req, res){
      const account = await accountService.getAccount(req.user.name);
      const clan = await clanService.getClanByUser(account.coach); 
      const leader = await accountService.hasRole(req.user.name, "clanleader");
      res.json({ clan:clan, leader:leader && account.coach.toLowerCase() === clan.leader.toLowerCase() } );
    });

    this.router.use("/draft", new draftApi().routesConfig());

    this.router.get("/competition/:division/:round/:house",util.ensureAuthenticated, util.hasRole("admin","clanadmin"),async function(req,res){
      let data = await clanService.getCompetitionInformation(req.params.division, Number(req.params.round), Number(req.params.house));

      data = data.filter(x => x.Row.CompetitionStatus === "0");


      const mapData = function(p){
        return {
          coachId: Number(p.RowTeam.IdCoach),
          coachName: p.NameCoach || p.Coach.User,
          logo: p.RowTeam.Logo,
          teamId: Number(p.RowTeam.ID.Value.replace(/\D/g,"")),
          teamName: p.RowTeam.Name,
          notAcceptedTicket: Object.prototype.hasOwnProperty.call(p,"Coach")
        };
      };

      let returnValue = data.map(x => {
        return {
          competitionId : Number(x.Row.Id.Value.replace(/\D/g,"")),
          competitionName: x.Row.Name,
          coaches: x.participants.map(mapData).concat(x.tickets.map(mapData))
        };
      });

      res.json(returnValue);
    });

    this.router.put("/assassinate/:teamId/:playerId",util.ensureAuthenticated, util.hasRole("admin","clanadmin"),function(req,res){
      clanService.assassinate(Number(req.params.teamId),Number(req.params.playerId));

      res.status(200).send();
    });

    this.router.put("/abandon/:contestId",util.ensureAuthenticated, util.hasRole("admin","clanadmin"),function(req,res){
      clanService.abandon(Number(req.params.contestId));
      res.status(200).send();
    });

    this.router.get("/:season/:division/:round/:house", async function(req, res){
      let schedule = await dataService.getSchedule({
        league:"clan", 
        season:req.params.season, 
        competition:req.params.division,
        round:Number(req.params.round),
        house:Number(req.params.house)
      });
      let clans = await dataService.getClans({name:{$in:[schedule.home.clan,schedule.away.clan]},season:req.params.season});

      schedule.home.clan = clans.find(c => c.name === schedule.home.clan);
      schedule.away.clan = clans.find(c => c.name === schedule.away.clan);

      let teams = await dataService.getTeams({"team.id":{$in:schedule.home.clan.ledger.teams.filter(x => x.active).map(team=> team.team.id).concat(schedule.away.clan.ledger.teams.filter(x => x.active).map(team=> team.team.id))}});

      const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: "base"});
      for(var x = 0; x <5; x++){
        schedule.home.clan.teams[x] = teams.find(t => collator.compare(t.team.name,schedule.home.clan.teams[x]) === 0 );
        schedule.away.clan.teams[x] = teams.find(t => collator.compare(t.team.name,schedule.away.clan.teams[x]) === 0);
      }

      delete schedule.home.clan.ledger;
      delete schedule.away.clan.ledger;

      res.header("Access-Control-Allow-Origin", "http://localhost:8080").json(schedule);
    });

    this.router.get("/schedule/:season/:division", async function(req, res){
      let schedules = await dataService.getSchedules({league:"clan", season:req.params.season, competition:new RegExp(req.params.division,"i")});
      let clans = await dataService.getClans({division:new RegExp(req.params.division,"i"), season:req.params.season});

      schedules.map(x =>{
        x.home.logo = clans.find(c => c.name === x.home.clan).logo;
        x.away.logo = clans.find(c => c.name === x.away.clan).logo;
      });

      res.json(schedules);
    });

    this.router.put("/eic/:matchId/:playerId",util.ensureAuthenticated, util.hasRole("admin","clanadmin"),async function(req,res){
      const playerId = Number(req.params.playerId);
      let player = await dataService.getPlayer({id:playerId});

      let cas_sustained = player.casualties_sustained;
      let cas_state = player.casualties_state;
      let cas_sustained_total = player.casualties_sustained_total || [];

      cas_sustained.splice(cas_sustained.length-1,1);
      cas_sustained.push("PinchedNerve");

      cas_state.splice(cas_state.length-1,1);
      cas_state.push("PinchedNerve");

      cas_sustained_total.splice(cas_sustained_total.length-1,1);
      cas_sustained_total.push("PinchedNerve");

      dataService.updatePlayer({id:playerId},{$set:{"casualties_sustained":cas_sustained,"eic":true,active:true,casualties_state: cas_state, casualties_sustained_total:cas_sustained_total}});

      dataService.updateMatch({uuid:req.params.matchId},{$set:{"match.teams.$[].roster.$[player].eic":true}},{arrayFilters:[{"player.id":playerId}]});
      dataService.updateSchedule({league:"clan","matches.match_uuid":req.params.matchId},{$set:{"matches.$.eic":true}});

      res.status(200).send();
    });

    this.router.get("/clans", async function(req, res){
      res.json(await clanService.getClans({active:true}));
    });

    this.router.get("/powers", function(req,res){
      res.header("Access-Control-Allow-Origin", "http://localhost:8080").json( [
      {key:"version2.1",description:2.1},
      {
        key: "miscommunication",
        name: "Miscommunication!",
        cost: 100,
        quantitiy: 2,
        description: "This power causes opponents to \"miscommunicate\" their intended draft day powers, acting as if those powers were never used at all! The use of this power must be stated to a clan admin (who is NOT in your clan) in a PM prior to the draft. Only notify the opposing Clan Leader AFTER the draft is complete of your diabolical ruse (unless they play Confusion!, in which case they must be told immediately)! Any clan powers used by your opponent failed to trigger, and remain available for future weeks. If BOTH clans attempted to use \"Miscommunication\", both clans use up one charge of this power. Additionally, if this power is used by a clan, then no other clan powers may be activated by this clan during the draft. However, powers such as Emergency Intensive Care which are not called during the draft are still ok to use."
      },{
        key: "emergencyRnR",
        name: "Emergency R&R!",
        cost: 50,
        quantitiy: 3,
        description: "At the start of a draft, the clan leader may choose a team from his own clan and award it a free resting match prior to their next competitive match. The team will concede to an admin team before playing their match and will thus regain all their MNGed players, and may lose 1 Fan Factor as an (uncontrolled by clan admin) bi-product."
      },{
        key: "lastMinuteSwitch",
        name: "Last Minute Switch!",
        cost: 150,
        quantitiy: 1,
        description: "At the end of the draft, the clan leader may pick two teams from his clan and switch up their matches. Coach A will thus face the opponent of Coach B instead, while Coach B faces the opponent of Coach A. Once a Last Minute Switch! is played, the opposing clan may not use a Last Minute Switch! that would affect any of the 4 coaches involved in the first switch."
      },{
        key: "lockBank",
        name: "Lock Bank!",
        cost: 50,
        quantitiy: 1,
        description: "At the end of the draft, the clan leader may pick a team from the opposing clan. That team’s bank has been completely shut down! They will not be allowed to spend ANY money from their bank until the FOLLOWING Clan week. This includes buying players, burning excess cash, adding to inducement, etc. They are still allowed to use petty cash during the inducement phase if they play  against a higher TV team, but may not add to it in any way from their own cash. Please note you get two charges of this power."
      },{
        key: "newBlood",
        name: "New Blood!",
        cost: 100,
        quantitiy: 1,
        description: `Within 24 hours after the team played its last match (and before the next draft), the clan leader can nominate that team to be removed from the league permanently and replaced with a new team costing the same in gold as the original team did AT THE START OF THE SEASON.

        This new team follows the same rules for buying players and skills as any new team. The new team may be of a different race if so desired, but still must be unique to the clan. If the new team is the same race as the original team, a single player from the original roster may be kept as a legacy player. This legacy player costs the same in gold as he is listed as valued in-game. This legacy player counts towards the number of superstars on the new team (as the team’s first superstar, although his 10k superstar tax is considered part of the price paid for him already). The legacy player also counts towards the number of statistic increased players AND number of doubles players (if the legacy player has any stats or doubles). For instance, a legacy +ST and +AG dorf runner with dodge and sidestep would thus consume both the statistic and double quota of the new blood:ed Dorf team. He would still be legal, however, as he earned those stats and doubles the hard way! A second superstar on that Dorf team would cost 20k tax, a third 30k, etc, as per the rules on superstars.
        
        Please use the ledger from the start of the season, and make sure you list the correct name on a legacy player and list the actual value of this player as cost. Please use the separate New Blood tab in the ledger, where the potential legacy player has a separate spot at the top for cost, rolls selected and skill-ups! After the ledger comes to the same price as the previous team, create the team in-game according to the new team rules. The new team ledger (and in-game team created) must be provided within 48 hours of the match being over to the admin team for review.
        
        NOTE: If either of the two deadlines is missed, then the power will be processed one round later than intended. If you are drafting before the New Blood! has been fully validated, then the power will not be processed until one round later than intended.
        
        You cannot switch tiers upwards when using this power, if you move downwards a tier you DO NOT receive any tax rebate associated with that tier. You cannot use this power on a team that started the season under 1100 TV. This power is not mandatory if rolled as part of Nuffle's Will! (see below).`
      },{
        key: "assassination",
        name: "Assassination!",
        cost: 100,
        quantitiy: 2,
        description: `At the start of a draft you may nominate 1 player from any of the teams in the opposing clan and have a hitman attempt to assassinate their player. Roll a d6 using the discord dice bot. On a roll of a 2+ the assigned player is injured during the assassination attempt and must miss the next match! Sadly, the quality of assassins (or the toughness of Blood Bowl players!) these days mean they leave no permanent injury. This is handled by an admin game being used to apply an MNG injury to the player in question. 

        If you roll a 1, the assassin is interrupted during his task by a random player on the opposing team and attacks them instead! Randomly determine a player on the opposing team WHO WAS NOT THE ORIGINAL TARGET to receive an MNG instead. 

        This power cannot be used to target a player that has already been a target of assassination (either directly, or indirectly) earlier in the season. Assassin’s have too much professional pride to take sloppy seconds! Granted, if the same team is targeted and a 1 is rolled, the same player could accidentally be assassinated instead of the targeted teammate if they are unlucky enough.`
      },{
        key: "emergencyIntensiveCare",
        name: "Emergency Intensive Care!",
        cost: 0,
        quantitiy: 1,
        description: `The player will be whisked away after the game into intensive care to recover from any lasting injury suffered during the game. This means if a player suffers a permanent injury (niggle, stat bust, death) during the game, the coach can decide to not confirm the game and ask his clan leader to use the power. The injury will be changed into MNG by a Clan League Admin instead. 

        The power needs to be officially claimed by the clan leader (or their nominated vice captain, if the clan leader is otherwise unavailable) in the discord channel no later than 24 hours after the game has been played. The game cannot be confirmed in order to be used, so coaches are responsible for pressing “NO” when asked to confirm the game, if you intend to request this power or are considering using it. This power cannot be prevented by using miscommunication.

        Additionally, the power can also be used any number of times at the start of the season to heal an old injury on a returning player, without applying the MNG. This will not count towards the available use of the power, but will cost 100k of the new season’s bank (i.e. NOT from the clan power budget). You need to note this on your “Clan Ledger” when you complete the team re-buy process and you can then purchase the affected player without the injury. This power is automatically added to every clan’s available power list, whether you buy it or not. It has traditionally crowded out other interesting powers, but adds a lot of value to the league so REBBL has decided to officially socialise healthcare!`
      },{
        key: "inspiration",
        name: "Inspiration!",
        cost: 100,
        quantitiy: 2,
        description: "At the start of a draft nominate one player from one of your clan’s teams who is within 5 SPP of levelling. This player has been working hard on the training grounds between matches and has gained a level! The level up will be provided by setting up a game vs an admin team, which will be awarded as an admin concede loss to the clan team (which may result in a loss of Fan Factor). The player to level will receive pass/intercept/cas spp to gain the needed spp to level. A second concede admin game will be assigned after the first, to reissue any MNG injuries on the team. The second game will be applied even if there are no MNG on the team for consistency, due to the potential loss of Fan Factor in each game."
      },{
        key: "confusion",
        name: "Confusion!",
        cost: 50,
        quantitiy: 2,
        description: "Play this power before the draft occurs. This power switches the draft order, causing the team that was due to draft second to draft first instead. You may not play a Confusion! to counter an opponent's Confusion! Additionally, this power does not switch the order of power usage in a draft."
      },{
        key: "homefieldAdvantage",
        name: "Home Field Advantage!",
        cost: 50,
        quantitiy: 2,
        description: "Use this power after drafting is complete. Picking one matchup from your draft, your team will ALWAYS be the home team this round. Your opponent cannot play this power to affect the same matchup. IT IS YOUR COACH’S RESPONSIBILITY TO ENSURE THAT THE CLAN LEADER STARTING THE MATCH IS AWARE YOU NEED TO BE MANUALLY SEEDED AS THE HOME TEAM. It is the responsibility of the clan leader creating the match to include HFA at the start of the match name, and the responsibility of the clan leader that used HFA to validate that the name was given! Please note you get two charges of this power."
      },{
        key: "hatredOfPubliTransport",
        name: "Hatred of Public Transport!",
        cost: 50,
        quantitiy: 2,
        description: "Play this power before either clan has drafted. Pick one team from your opponent’s clan who refuses to be the \"Bus\"!  This team may not be “bused” (i.e. offered-up) by their clan leader when it’s that clan’s turn to nominate their first blindly offered team. Teams selected by this power then become immune to “Last Minute Switch” and their match may not be altered. Each Clan may only use this power once per draft. Please note you get two charges of this power."
      },{
        key: "draftDodgers",
        name: "Draft Dodgers!",
        cost: 50,
        quantitiy: 2,
        description: "Play this power at the beginning of a draft. Both coaches have turned up late to the draft! Roll 1D3 and determine that many matchups at random (assign numbers 1-5 to the teams in each clan and roll a D5 as many times as necessary to generate the required number of matchups) as the officials start making decisions on the coaches' behalf. The remaining matchups are decided in the usual fashion following the original order of the draft. Coaches affected by this power CAN still be affected by “Last Minute Switch” but CANNOT be affected by “Hatred of Public Transport”. If both clans play this power in the same draft, roll both D3 and take the highest result."
      },{
        key: "eldrilSidelined",
        name: "Eldril: Sidelined!",
        cost: 50,
        quantitiy: 2,
        description: "Play this power at the end of a draft. Pick a star player - you manage to convince them that the pitch is a particularly hostile environment this week and that it’s better for their health insurance premium if they don’t show up! This means that this star player cannot be hired by either clan this round (in any of the matches). This power can not be used on Deeproot Strongbranch, because he’s a goddamn TREE and your argument is invalid (Note: Deeproot insists that all stuntie teams are unable to be affected by this power and I’m not going to argue with him, for the previously stated reasons). He also crushed the first two enforcers sent to threaten him, so there have been issues finding willing insurance agents to approach him again. Please note this power comes with two charges."
      },{
        key: "nufflesWill",
        name: "Nuffles Will!",
        cost: 100,
        quantitiy: 2,
        description: "Use this power at the beginning of a draft to leave the choice of a power up to the fickle god that is Nuffle. Roll 1D14 using the discord dice bot and use the power associated with that number (counting down the power list) during this draft, you may not play any other powers during this draft phase, this power is unaffected by Miscommunication! If you roll this ability (a 14) you are truly blessed by Nuffle and may roll 2D13 and receive both associated powers! As noted in New Blood you DO NOT have to use that power if it is rolled, but you are not allowed to re-roll it if you select not to use it. Furthermore, you may use Emergency Intensive Care in the same round as this power is used (and can use ALL EIC’s if you roll extra via this power) but any EIC gained by this power may not be stockpiled for future rounds."
      },{
        key: "financialFraudAudit",
        name: "Financial Fraud Audit!",
        cost: 50,
        quantitiy: 2,
        description: `At the end of the draft, the clan leader buys off a Blood Bowl Bank Association official to conduct a 'random' financial fraud audit of the opposing clan's treasury. Depending on how many charges are used of this power, it has slightly different effects.

        For 1 charge, the clan leader gently directs the auditor to have a look at target team in the opposing clan. During the inducement phase, the targeted team cannot use any bank cash to add to the petty cash (which is given based on the TV difference). The team is free to use the petty cash as they see fit, however.
        
        For 2 charges, the clan leader sets off a general fraud audit, which affects all match-ups for BOTH clans. During inducements, no team from either clan may use any bank cash to add to the petty cash (which is given based on the TV difference). The teams are free to use the petty cash as they see fit, however.
        
        The power may only be used ONCE every draft by the same clan (for the 1 charge version or the 2 charge version, i.e. not two 1 charge versions). However, if both clans use the 1 charge version, it automatically becomes the 2 charges version of the power instead! Please note you get two charges of this power for each 50k spent. `
      },{
        key: "bloodSacrifice",
        name: "Blood Sacrifice!",
        cost: 50,
        quantitiy: 2,
        description: `At the end of the draft, the clan leader may target one of the clan’s own teams. That team sacrifices one or two players to the God of Kash. If one player is sacrificed, the team gets an admin win game and receives the winnings. However, all SPP are placed on the sacrificed player who is killed in the process. If two players are targeted, the team gets an admin concede win (i.e. likely more Kash!) instead but all SPP is again put on the killed players. It is legal to sacrifice MNG players (we have the technology!). An admin game (concede loss) may be needed to reapply any (not sacrificed) MNG again`
      },{
        key: "badInducementDeal",
        name: "Bad Inducement Deal!",
        cost: 50,
        quantitiy: 2,
        description: `At the start of the draft, the clan leader may pick any one inducement and one opposing team. During that team’s match for the round, this inducement may not be bought during the inducement phase. The team may take any other inducement as normal, however. Note that stadiums that e.g. give wizards or bribes still do so, and may be used during game. Similarly, if a kick-off event gives for instance bribes, these are free to use even if Bribe was the inducement picked in a Bad Inducement Deal! as it is only PURCHASES DURING INDUCEMENT that is prohibited. If a coach forgets or otherwise violates this, ask for the game to be reset by an admin. `
      }]);
    });

    this.router.put("/:season/:division/:round/:house/:clan/usepower/:power", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req,res){
      let schedule = await dataService.getSchedule({
        league:"clan", 
        season:req.params.season, 
        competition:req.params.division,
        round:Number(req.params.round),
        house:Number(req.params.house)
      });
      let clan = await dataService.getClan({name:req.params.clan, active:true});

      const updatePowers = function(side,power){
        if(!side.usedPowers) {
          side.usedPowers = {};
        }
        if(side.usedPowers[power]) side.usedPowers[power]++;
        else side.usedPowers[power] =1;
      };

      if (schedule.home.clan === clan.name){
        updatePowers(schedule.home, req.params.power);
        await dataService.updateSchedule({_id:schedule._id},{$set:{"home.usedPowers":schedule.home.usedPowers}});
      }else{
        updatePowers(schedule.away, req.params.power);
        await dataService.updateSchedule({_id:schedule._id},{$set:{"away.usedPowers":schedule.away.usedPowers}});
      }

      clan.powers[req.params.power]--;
      try{
        await dataService.updateClan({name:clan.name, active:true},{$set:{powers:clan.powers}});
        res.status(202).send();
      }
      catch(ex){
        res.status(500).send(ex.message);
      }
    });

    this.router.put("/:season/:division/:round/:house/:clan/unusepower/:power", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req,res){
      let schedule = await dataService.getSchedule({
        league:"clan", 
        season:req.params.season, 
        competition:req.params.division,
        round:Number(req.params.round),
        house:Number(req.params.house)
      });
      let clan = await dataService.getClan({name:req.params.clan, active:true});

      const updatePowers = function(side,power){
          side.usedPowers[power]--;
      };

      if (schedule.home.clan === clan.name){
        updatePowers(schedule.home, req.params.power);
        await dataService.updateSchedule({_id:schedule._id},{$set:{"home.usedPowers":schedule.home.usedPowers}});
      }else{
        updatePowers(schedule.away, req.params.power);
        await dataService.updateSchedule({_id:schedule._id},{$set:{"away.usedPowers":schedule.away.usedPowers}});
      }

      clan.powers[req.params.power]++;
      try{
        await dataService.updateClan({name:clan.name, active:true},{$set:{powers:clan.powers}});
        res.status(202).send();
      }
      catch(ex){
        res.status(500).send(ex.message);
      }
    });
    
    this.router.get("/:clan", async function(req, res){
      const clan = await clanService.getClanByName(req.params.clan); 
      res.json({ clan:clan, leader:false} );
    });
      
    this.router.post('/:clan/upload', util.ensureAuthenticated, util.hasRole("clanleader"), uploadStrategy, async (req, res) => {

      let clan = await clanService.getClanByName(req.params.clan);
      let account = await accountService.getAccount(req.user.name);
      if (!clan || clan.leader.toLowerCase() !== account.coach.toLowerCase()){
        res.status(403).send(`you're not the leader of this clan, ${clan.leader} is.`);
        return;
      }

      const
          blobName = this.getBlobName(`${req.params.clan}-${req.file.originalname}`)
        , stream = getStream(req.file.buffer)
        , streamLength = req.file.buffer.length;
  
      blobService.createBlockBlobFromStream(containerName, blobName, stream, streamLength, {contentSettings:{contentType:req.file.mimetype}} , err => {
        if(err) {
          res.status(500).send(err);
          return;
        }
        
        clanService.setLogo(req.params.clan, blobName);

        res.status(200).send(blobName);
      });
    });

    this.router.put("/:season/:division/:round/:house/:clan/score/:score", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req,res){

      let schedule = await dataService.getSchedule({
        league:"clan", 
        season:req.params.season, 
        competition:req.params.division,
        round:Number(req.params.round),
        house:Number(req.params.house)
      });      

      if(!schedule){
        res.status(500).json("schedule not found");
      } else{
        let score = Number(req.params.score);
        if(schedule.home.clan === req.params.clan)
          await dataService.updateScheduleAsync({_id:schedule._id},{$set:{"home.score":score}});
        else 
          await dataService.updateScheduleAsync({_id:schedule._id},{$set:{"away.score":score}});
        
        res.send(202).send();
      }

    });

    this.router.put("/:season/:division/:round/:house/game/:id/:index/score/:score", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req,res){
      let schedule = await dataService.getSchedule({
        league:"clan", 
        season:req.params.season, 
        competition:req.params.division,
        round:Number(req.params.round),
        house:Number(req.params.house)
      });

      if(!schedule){
        res.status(500).json("schedule not found");
      } else{
        let id = Number(req.params.id);
        let score = Number(req.params.score);
        if(Number(req.params.index) === 0)
          await dataService.updateScheduleAsync({_id:schedule._id, "matches.contest_id":id},{$set:{"matches.$.opponents.0.team.score" :score}});
        else
          await dataService.updateScheduleAsync({_id:schedule._id, "matches.contest_id":id},{$set:{"matches.$.opponents.1.team.score" :score}});
        res.status(202).send();
      }
    });

    this.router.put("/:season/:division/:round/:house/game/:id/reset/", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req,res){
      let schedule = await dataService.getSchedule({
        league:"clan", 
        season:req.params.season, 
        competition:req.params.division,
        round:Number(req.params.round),
        house:Number(req.params.house)
      });
      
      if(!schedule){
        res.status(500).json("schedule not found");
      } else{
        let id = Number(req.params.id);
        await dataService.updateScheduleAsync({_id:schedule._id, "matches.contest_id":id},{$set:{"matches.$.counted" :false}});
        res.status(202).send();
      }
    });

    this.router.get("/refreshMatch/:uuid", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req,res){
      await clanService.getMatchData(req.params.uuid);
      res.status(200).send();
    });

    this.router.get("/team/:name", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req,res){
      let team = await cyanideService.team({platform:"pc",name:req.params.name});
      if (team) res.status(200).send();
      else res.send(404).send();
    });

    this.router.post("/:clan/applynewblood/:teamId/:newTeamName",util.ensureAuthenticated, util.hasRole("admin","clanadmin"),async function(req,res){
      await clanService.newBlood(req.params.clan,Number(req.params.teamId),req.params.newTeamName);

      res.status(200).send();
    });

    this.router.post("/:clan/substitutecoach/:teamId/:newTeamName",util.ensureAuthenticated, util.hasRole("admin","clanadmin"),async function(req,res){
      await clanService.newCoach(req.params.clan,Number(req.params.teamId),req.params.newTeamName);

      res.status(200).send();
    });

  
    return this.router;
  }


}

module.exports = ClanApi;