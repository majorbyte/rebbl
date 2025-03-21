'use strict';


const loggingService = require('../../../lib/loggingService.js');

const express = require('express')
  , accountService = require("../../../lib/accountService.js")
  , cyanideService = require("../../../lib/CyanideService.js")
  , clanService = require("../../../lib/ClanService.js")
  , dataService = require("../../../lib/DataService.js").rebbl
  , clanBuildingApi = require('./clanBuilding.js')
  , draftApi = require("./draft.js")
  , rateLimit = require("express-rate-limit")
  , util = require('../../../lib/util.js')
  , multer = require('multer')
  , getStream = require('into-stream')
  , fs = require('fs/promises');

class ClanApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }

  routesConfig(){
    this.router.get("/", util.ensureAuthenticated, async function(req, res){
      const account = await accountService.getAccount(req.user.name);
      let clan = await clanService.getClanByUser(account.bb3coach); 
      if (!clan) clan = await clanService.getClanByLeader(account.bb3coach);
      const leader = await accountService.hasRole(req.user.name, "clanleader");
      res.json({ clan:clan, leader:leader && account.bb3coach.toLowerCase() === clan?.leader?.toLowerCase() } );
    });

    this.router.use("/build", new clanBuildingApi().routesConfig());

    this.router.use("/draft", new draftApi().routesConfig());

    this.router.get("/competition/:division/:round/:house",util.ensureAuthenticated, util.hasRole("admin","clanadmin"),async function(req,res){
      return res.json([]);
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
      clanService.assassinate(req.params.teamId,req.params.playerId);

      res.status(200).send();
    });

    this.router.put("/abandon/:contestId",util.ensureAuthenticated, util.hasRole("admin","clanadmin"),function(req,res){
      clanService.abandon(req.params.contestId);
      res.status(200).send();
    });

    this.router.get("/:season/:division/:round/:house", async function(req, res){
      try{
        let schedule = await dataService.getSchedule({
          league:"clan", 
          season:req.params.season, 
          competition:req.params.division,
          round:Number(req.params.round),
          house:Number(req.params.house)
        });
        if (!schedule) return {};
        let clans = await dataService.getClans({name:{$in:[ RegExp(`^${schedule.home.clan}$`,"i"),RegExp(`^${schedule.away.clan}$`,"i")]},season:req.params.season});

        schedule.home.clan = clans.find(c => c.name.localeCompare(schedule.home.clan,undefined,{sensitivity:"base"}) === 0);
        schedule.away.clan = clans.find(c => c.name.localeCompare(schedule.away.clan,undefined,{sensitivity:"base"}) === 0);

        let teams = await dataService.getTeams({"team.id":{$in:schedule.home.clan.ledger.teams.filter(x => x.active).map(team=> team.team.id).concat(schedule.away.clan.ledger.teams.filter(x => x.active).map(team=> team.team.id))}});

        const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: "base"});
        for(var x = 0; x <5; x++){
          schedule.home.clan.teams[x] = teams.find(t => collator.compare(t.team.name,schedule.home.clan.teams[x]) === 0 );
          schedule.away.clan.teams[x] = teams.find(t => collator.compare(t.team.name,schedule.away.clan.teams[x]) === 0);
        }

        delete schedule.home.clan.ledger;
        delete schedule.away.clan.ledger;

        const coaches = schedule.home.clan.members.map(x => x.coach).concat(schedule.away.clan.members.map(x => x.coach));
        const donations = await dataService.getAccounts({coach:{$in:coaches},"showDonation":true},{projection:{coach:1}});
        schedule.donations = donations;
        res.json(schedule);
      } catch(e){
        res.status(400).send();
      }
    });

    this.router.get("/schedule/:season/:division", async function(req, res){
      let schedules = await dataService.getSchedules({league:"clan", season:req.params.season, competition:new RegExp(req.params.division,"i")});
      let clans = await dataService.getClans({division:new RegExp(req.params.division,"i"), season:req.params.season});

      schedules.map(x =>{
        x.home.logo = clans.find(c => c.name.localeCompare(x.home.clan,undefined,{sensitivity:"base"}) === 0)?.logo;
        x.away.logo = clans.find(c => c.name.localeCompare(x.away.clan,undefined,{sensitivity:"base"}) === 0)?.logo;
      });

      res.json(schedules);
    });

    const apiRateLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 hour window
      max: 1, // start blocking after 1 requests
      message:
        "Please don't spam this, wait 60 seconds",
      keyGenerator: function(req){
        return req.user ? req.user.name : "NotLoggedIn";
      }

    });

    this.router.put("/start/:division/:round/:house",apiRateLimiter, async function(req,res){
      if (!req.user || !req.user.name){
        return res.status(400).send("You need to be logged in.");
      }
      try{
        await clanService.startCompetitions(req.user.name,req.params.division, Number(req.params.round), Number(req.params.house));
        res.status(200).send();
      }
      catch(e){
        loggingService.error(e);
        res.status(400).send(e.message);
      }
    });

    this.router.put("/eic/:matchId/:playerId",util.ensureAuthenticated, util.hasRole("admin","clanadmin"),async function(req,res){
      const playerId = req.params.playerId;
      let player = await dataService.getPlayer({id:playerId});

      let cas_sustained = player.casualties_sustained;
      let cas_state = player.casualties_state;
      let cas_sustained_total = player.casualties_sustained_total || [];

      cas_sustained.splice(cas_sustained.length-1,1);
      cas_sustained.push("seriously_hurt");

      cas_state.splice(cas_state.length-1,1);
      cas_state.push("seriously_hurt");

      cas_sustained_total.splice(cas_sustained_total.length-1,1);
      cas_sustained_total.push("seriously_hurt");

      dataService.updatePlayer({id:playerId},{$set:{"casualties_sustained":cas_sustained,"eic":true,active:true,casualties_state: cas_state, casualties_sustained_total:cas_sustained_total}});

      dataService.updateMatch({uuid:req.params.matchId},{$set:{"match.teams.$[].roster.$[player].eic":true}},{arrayFilters:[{"player.id":playerId}]});
      dataService.updateSchedule({league:"clan","matches.game_id":req.params.matchId},{$set:{"matches.$.eic":true}});

      res.status(200).send();
    });

    this.router.get("/clans", async function(req, res){
      res.json(await clanService.getClans({active:true}));
    });

    this.router.get("/powers", function(req,res){
      res.json( [
      {key:"version13.1",description:13.1},
      {
        key: "miscommunication",
        name: "Miscommunication!",
        cost: 150,
        quantitiy: 1,
        description: "This power causes opponents to \"miscommunicate\" their intended draft day powers, acting as if those powers were never used at all! The use of this power must be stated to a clan admin (who is NOT in your clan) in a PM prior to the draft. Only notify the opposing Clan Leader AFTER the draft is complete of your diabolical ruse! Miscommunication! negates all other powers used by both clans for that draft. Such negated powers are still available for the next draft. Post-game powers are still ok to use even if Miscommunication! was called as they do not happen during the draft. If BOTH clans attempted to use Miscommunication!, both clans use up one charge of this power."
      },{
        key: "emergencyRnR",
        name: "Emergency R&R!",
        cost: 0,
        quantitiy: 3,
        description: "At the start of a draft, the clan leader may choose a team from his own clan and award it a free resting match prior to their next competitive match. The team will concede to an admin team before playing their match and will thus regain all their MNG players."
      },{
        key: "lastMinuteSwitch",
        name: "Last Minute Switch!",
        cost: 150,
        quantitiy: 1,
        description: "At the end of the draft, the clan leader may pick two teams from his clan and switch up their matches. Coach A will thus face the opponent of Coach B instead, while Coach B faces the opponent of Coach A. Once a Last Minute Switch! is played, the opposing clan may not use a Last Minute Switch! that would affect any of the 4 coaches involved in the first switch."
      },{
        key: "newBlood",
        name: "New Blood!",
        cost: 0,
        quantitiy: 1,
        description: `Deadlines:
        Locked into Clan Builder (i.e. fully validated): End of the round, Monday 23:59 UTC and in good time before the next draft.
        
        The clan leader (or nominated deputy) can use the New Blood power, thereby removing the target team from the league permanently and replacing it with a new team costing the same in gold as the original team did AT THE START OF THE SEASON. 

        Clan leaders may use the New Blood button next to one of their teams in the Clan Builder tool to test and consider if they want to use New Blood or not. The power is only called once the Clan Leader locks in a fully validated team no later than at the end of the round, i.e. Monday 23:59 UTC, but in good time before your next draft. This deadline will never be extended for any reason. Effectively, this makes playing games very late in the round more risky as it gives the clan less time to sort out a possible use of New Blood before the end of the round. On the other hand, games played earlier in the round will mean that clans have much more time to finalize and validate the new team, and also makes it much easier to know which of multiple teams in a round that New Blood is best used on.

        You cannot switch tiers upwards when using this power, if you move downwards a tier you DO NOT receive any tax rebate associated with that tier. You cannot use this power on a team that started the season under 1100 TV. After your New Blood team comes to the same price (in Gold Pieces) as the previous team, create the team in-game according to the New Blood tab and submit the new team ledger (plus team created in-game) to a division admin over PM for review. 
        `
      },{
        key: "assassination",
        name: "Assassination!",
        cost: 100,
        quantitiy: 2,
        description: `At the end of a draft you may nominate 1 player from any of the teams in the opposing clan and have a hitman attempt to assassinate their player. Sadly, the quality of assassins (or the toughness of Blood Bowl players!) these days mean they leave no permanent injury. This is handled by an admin game being used to apply an MNG injury to the player in question. 

        This power cannot be used to target a player that has already been a target of assassination (either directly, or indirectly) earlier in the season. Assassin’s have too much professional pride to take sloppy seconds!`
      },{
        key: "emergencyIntensiveCare",
        name: "Emergency Intensive Care!",
        cost: 0,
        quantitiy: 1,
        description: `Deadline:
        Call power: With 24 hours of game ending.
        
        Within 24 hours after the team played its last match (and before the next draft), the clan leader (or nominated deputy) may specify one target player that will be whisked away after the latest game to be placed into intensive care. This means if a player suffers a permanent injury (niggle, stat bust, death) during the game. 
        
        The injury will then be changed into an MNG by a Clan League Admin instead. The game cannot be confirmed in order to be used, so coaches are responsible for pressing “NO” when asked to confirm the game, if you intend to request this power or are considering using it. This power cannot be prevented by using Miscommunication!. 
        
        In addition, it may be used any number of times at a cost of 100k/injury to heal an old battle scar on a returning player. This does not consume the power, as it happens between seasons. You need to note all perm removals on your clan ledger when you complete the team re-buy process.`
      },{
        key: "inspiration",
        name: "Inspiration!",
        cost: 100,
        quantitiy: 2,
        description: "At the start of a draft nominate one player from one of your clan’s teams who is within 5 SPP of levelling. This player has been working hard on the training grounds between matches and has gained a level! The level up will be provided by setting up a game vs an admin team, which will be awarded as an admin concede loss to the clan team. The player to level will receive pass/intercept/cas spp enough to gain the needed spp to level."
      },{
        key: "bloodSacrifice",
        name: "Blood Sacrifice!",
        cost: 0,
        quantitiy: 2,
        description: `At the end of the draft, the clan leader may target one of the clan’s own teams. That team sacrifices one or two players to the God of Kash (for a single use of the power). If one player is sacrificed, the team gets an admin win game and receives the winnings. However, all SPP are placed on the sacrificed player who is killed in the process. If two players are targeted, the team gets an admin concede win (i.e. likely more Kash!) instead but all SPP is again put on the killed players. It is legal to sacrifice MNG players (we have the technology!). In addition, sacrificing a player will restore any MNG on other players - such is the power of Kash (and the fear of being next in line for sacrifices)!`
      },{
        key: "badInducementDeal",
        name: "Bad Inducement Deal!",
        cost: 50,
        quantitiy: 2,
        description: `At the end of the draft, the clan leader may pick any one inducement and one opposing team. During that team’s match for the round, this inducement may not be bought during the inducement phase. 

        The team may take any other inducement as normal, however. Note that if a kick-off event e.g. gives bribes, these are free to use even if Bribe was the inducement picked in a Bad Inducement Deal as it is only PURCHASES DURING INDUCEMENT that is prohibited. 
        
        If a coach forgets or otherwise violates this, ask for the game to be reset by an admin. Both coaches have a responsibility to ensure the power does not get purchased during inducement, and that the game is reset right away. 
        
        If the game has progressed from kick-off, any mistakes will be allowed for that game. Coaches that make the mistake to buy a banned power more than once will face disciplinary action, and the clan that called the BID that did not get adhered to will get the use back. `
      },{
        key:"confusion",
        name:"Confusion!",
        cost:50,
        quantitiy:2,
        description:"At the start of the draft, play this power to switch the draft order, causing the team that was due to draft second to draft first instead. You may not play a Confusion! to counter an opponent's Confusion! Additionally, this power does not switch the order of power usage in a draft, so any powers already used when Confusion! is played remain called."
      },{
        key:"hatredOfPublicTransport",
        name:"Hatred of Public Transport!",
        cost:20,
        quantitiy:5,
        description:"At the start of the draft, pick one team from your opponent’s clan. This team refuses to be bussed (i.e. offered-up) by their clan leader when it’s that clan’s turn to offer up their FIRST team to the opposing clan leader. Teams selected by this power also become immune to Last Minute Switch! Each Clan may only use this power once per draft. "
      }
      ,{
        key: "stuntyLastMinuteSwitch",
        name: "Last Minute Switch! (stunty)",
        cost: 150,
        quantitiy: 1,
        description: "At the end of the draft, the clan leader may pick two teams from his clan - one of which is a stunty team - and switch up their matches. Coach A will thus face the opponent of Coach B instead, while Coach B faces the opponent of Coach A. Once a Last Minute Switch is played, the opposing clan may not use a Last Minute Switch that would affect any of the 4 coaches involved in the first switch."
      }
      ,{
        key: "stuntyAssassination",
        name: "Assassination! (stunty)",
        cost: 100,
        quantitiy: 2,
        description: `At the end of a draft you may nominate 1 player from any of the teams in the opposing clan that plays against one of your stunty teams. That opponent team have a hitman attempt to assassinate their player. That player must miss the next match! Sadly, the quality of assassins (or the toughness of Blood Bowl players!) these days mean they leave no permanent injury. This is handled by an admin game being used to apply an MNG injury to the player in question.
        This power cannot be used to target a player that has already been a target of assassination (either directly, or indirectly) earlier in the season. Assassin’s have too much professional pride to take sloppy seconds! 
        `
      },{
        key: "stuntyInspiration",
        name: "Inspiration! (stunty)",
        cost: 100,
        quantitiy: 2,
        description: "At the start of a draft nominate one player from one of your clan’s stunty teams who is within 5 SPP of levelling. This player has been working hard on the training grounds between matches and has gained a level! The level up will be provided by setting up a game vs an admin team, which will be awarded as an admin concede loss to the clan team. The player to level will receive pass/intercept/cas spp enough to gain the needed spp to level. "
      },{
        key: "stuntyBadInducementDeal",
        name: "Bad Inducement Deal! (stunty)",
        cost: 50,
        quantitiy: 2,
        description: `At the end of the draft, the clan leader may pick any one inducement and one opposing team playing against your stunty coach. During that team’s match for the round, this inducement may not be bought during the inducement phase. The team may take any other inducement as normal, however. Note that if a kick-off event e.g. gives bribes, these are free to use even if Bribe was the inducement picked in a Bad Inducement Deal as it is only PURCHASES DURING INDUCEMENT that is prohibited. If a coach forgets or otherwise violates this, ask for the game to be reset by an admin. Both coaches have a responsibility to ensure the power does not get purchased during inducement, and that the game is reset right away. If the game has progressed from kick-off, any mistakes will be allowed for that game. Coaches that make the mistake to buy a banned power more than once will face disciplinary action, and the clan that called the BID that did not get adhered to will get the use back.`
      },{
        key:"stuntyConfusion",
        name:"Confusion! (stunty)",
        cost:50,
        quantitiy:2,
        description:"At the start of the draft, play this power to switch the draft order, causing the team that was due to draft second to draft first instead. You may not play a Confusion! to counter an opponent's Confusion! Additionally, this power does not switch the order of power usage in a draft, so any powers already used when Confusion! is played remain called."
      },{
        key:"stuntyHatredOfPublicTransport",
        name:"Hatred of Public Transport! (stunty)",
        cost:20,
        quantitiy:5,
        description:"At the start of the draft, pick one team from your opponent’s clan. This team refuses to be bussed (i.e. offered-up) by their clan leader when it’s that clan’s turn to offer up their FIRST team to the opposing clan leader. Teams selected by this power also become immune to Last Minute Switch! Each Clan may only use this power once per draft. "
      },{
        key: "stuntyMiscommunication",
        name: "Miscommunication! (stunty)",
        cost: 150,
        quantitiy: 1,
        description: "This power causes opponents to \"miscommunicate\" their intended draft day powers, acting as if those powers were never used at all! The use of this power must be stated to a clan admin (who is NOT in your clan) in a PM prior to the draft. Only notify the opposing Clan Leader AFTER the draft is complete of your diabolical ruse! Miscommunication! negates all other powers used by both clans for that draft. Such negated powers are still available for the next draft. Post-game powers are still ok to use even if Miscommunication! was called as they do not happen during the draft. If BOTH clans attempted to use Miscommunication!, both clans use up one charge of this power."
      },{
        key:"financialFairPlay",
        name:"Financial Fair Play",
        cost:0,
        quantitiy:2,
        description:"The underdog coach cannot spend more than 40k GP from their own bank on inducements. In cases where the coaches are even on TV, then the coach going second in inducements may still not spend more than 40k. The power does not apply to Stunty (Tier 7) underdog coaches."
      }
    ]);
    });

    this.router.get("/data", util.ensureAuthenticated, util.hasRole("admin"),async (req,res) => {
      
      const schedules = await dataService.getSchedules({league:"clan", season:"season 19"});
      
      const data = [];

      const countRace = (match, index) =>{
        if (/\[admin\]/i.test(match.opponents[0].team.name) || /\[admin\]/i.test(match.opponents[1].team.name)) return;

        let d = data.find(x => x.race === match.opponents[index].team.race);
        if (!d) {
          d = {
            race : match.opponents[index].team.race,
            win: 0,
            draw: 0,
            loss: 0
          };
          data.push(d);
        }

        if (!match.winner) d.draw++;
        else if (match.winner.index == index) d.win++;
        else d.loss++

      };

      for(let schedule of schedules)
      for(let match of schedule.matches.filter(m => m.opponents && m.match_status !== "Scheduled"))
      for(let x of [0,1]) countRace(match,x);

      const getCSV = (race) => Object.keys(race).map(x => `${JSON.stringify(race[x])}` ).join(",");
     
      const csv = data.map(row =>getCSV(row)).join("\r\n");
    
      res.setHeader("content-type", "text/csv");
      res.set('Content-Type', 'application/octet-stream');
      res.attachment(`clan-races.csv`);
      res.send(`"race","win","draw","loss"\r\n${csv}`);
    });
    
    this.router.get("/coaches",util.ensureAuthenticated, util.hasRole("admin","clanadmin"),async function(req,res){
      const coaches = await clanService.getCoaches();
      res.json(coaches);
    });

    this.router.get("/season/:season/:clan", async function(req, res){
      const clan = await clanService.getClanByNameAndSeason(req.params.clan,req.params.season); 
      res.json({ clan:clan, leader:false} );
    });

    this.router.get("/:clan", async function(req, res){
      const clan = await clanService.getClanByName(req.params.clan); 
      res.json({ clan:clan, leader:false} );
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
        dataService.updateSchedule({_id:schedule._id},{$set:{"home.usedPowers":schedule.home.usedPowers}});
      }else{
        updatePowers(schedule.away, req.params.power);
        dataService.updateSchedule({_id:schedule._id},{$set:{"away.usedPowers":schedule.away.usedPowers}});
      }

      clan.powers[req.params.power]--;
      try{
        dataService.updateClan({name:clan.name, active:true},{$set:{powers:clan.powers}});
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
        dataService.updateClan({name:clan.name, active:true},{$set:{powers:clan.powers}});
        res.status(202).send();
      }
      catch(ex){
        res.status(500).send(ex.message);
      }
    });
    
    const multerStorage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, "images/clanlogos");
      },
      filename: (req, file, cb) => {
        const ext = file.mimetype.split("/")[1];
        cb(null, `${req.params.clan}-${file.originalname}`);
      },
    });
    const uploadStrategy = multer({ storage: multerStorage }).single('image');

    this.router.post('/:clan/upload', util.ensureAuthenticated, util.hasRole("clanleader"), uploadStrategy, async (req, res) => {
      try{
        let clan = await clanService.getClanByName(req.params.clan);
        let account = await accountService.getAccount(req.user.name);
        if (!clan || clan.leader.toLowerCase() !== account.bb3coach.toLowerCase()){
          res.status(403).send(`you're not the leader of this clan, ${clan.leader} is.`);
          return;
        }
  
        const fileName = `${req.params.clan}-${req.file.originalname}`;
  
        clanService.setLogo(req.params.clan, `images/clanlogos/${fileName}`);
  
        res.status(200).send(`images/clanlogos/${fileName}`);
      } catch(ex){
        console.error(ex);
      }
    });

    this.router.put("/:season/:division/:round/:house/:clan/score/:win/:draw/:loss", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req,res){

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
        const win = Number(req.params.win);
        const draw = Number(req.params.draw);
        const loss = Number(req.params.loss);
        if(schedule.home.clan === req.params.clan)
          await dataService.updateScheduleAsync({_id:schedule._id},{$set:{"home.win":win,"home.draw":draw,"home.loss":loss}});
        else 
          await dataService.updateScheduleAsync({_id:schedule._id},{$set:{"away.win":win,"away.draw":draw,"away.loss":loss}});
        
        res.status(202).send();
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
        let id = req.params.id;
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
        let id = req.params.id;
        await dataService.updateScheduleAsync({_id:schedule._id, "matches.contest_id":id},{$set:{"matches.$.counted" :false}});
        res.status(202).send();
      }
    });

    this.router.get("/refreshMatch/:uuid", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req,res){
      await clanService.getMatchData(req.params.uuid);
      res.status(200).send();
    });

    this.router.get("/team/:name", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req,res){
      let team = await cyanideService.team({platform:"pc",name:req.params.name,order:"creationdate"});
      if (team) res.status(200).send();
      else res.status(404).send();
    });

    this.router.post("/:clan/applynewblood/:teamId/:newTeamName",util.ensureAuthenticated, util.hasRole("admin","clanadmin"),async function(req,res){
      await clanService.newBloodAdmin(req.params.clan,req.params.teamId,req.params.newTeamName);

      res.status(200).send();
    });

    this.router.post("/:clan/substitutecoach/:teamId/:newTeamName",util.ensureAuthenticated, util.hasRole("admin","clanadmin"),async function(req,res){
      await clanService.newCoach(req.params.clan,req.params.teamId,req.params.newTeamName);

      res.status(200).send();
    });
  
    return this.router;
  }


}

module.exports = ClanApi;