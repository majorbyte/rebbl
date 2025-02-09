'use strict';

const express = require("express")
, cache = require("memory-cache")
, passport = require("passport")
, markdown =  require("markdown-it")()
, accountService = require("../../lib/accountService.js")
, dataService = require("../../lib/DataServiceBB3.js").rebbl3
, zflService = require("../../lib/ZFLService.js")
, util = require("../../lib/util.js");

class ZFL{
	constructor(){
		this.router = express.Router();
    this.year = 2494;

    this.router.use((req, res, next) => { res.locals.user = req.isAuthenticated() ? req.user : null; return next();});

    markdown.disable([ 'link', 'image' ]);

    this.router.get("/login", passport.authenticate("discord"));
    this.router.get("/logout", (req, res) => {req.logout(null, _ => _);res.redirect("/");});

    this.router.get('/discord/callback', passport.authenticate('discord', {failureRedirect: '/login'}), async (req, res) =>  await this.#loginSucces(req.user,res)); // auth success

    this.router.get("/", async (_,res) => res.render("zfl/standings" , {competitions:await dataService.getZFLCompetitions({year:this.year}), accounts:await dataService.getZFLAccounts({})}) );

    this.router.get("/account", this.#checkAuth, this.#getAccount );
    this.router.get("/profile/:id", this.#getProfile );

    this.router.get("/standings", async (_,res) => res.render("zfl/standings" , {competitions:await dataService.getZFLCompetitions({year:this.year}), accounts:await dataService.getZFLAccounts({})}));
    this.router.get("/playerstats",  async(_,res) =>  res.render("zfl/playerstats", await dataService.getZFLPlayerStats({statsType:"playerStats"})) ); // this.#getPlayerStats.bind(this));
    this.router.get("/teamstats",  async(_,res) =>  res.render("zfl/teamstats", await dataService.getZFLPlayerStats({statsType:"teamStatsStandings"})) ); // this.#getPlayerStats.bind(this));
    this.router.get('/fixtures',  this.#getFixtures.bind(this));
    this.router.get('/fixtures/admin', this.#ensureLoggedIn, this.#getFixturesAdmin.bind(this));

    this.router.get('/match/:id', this.#getMatch);

    this.router.get('/team/:id',  this.#getTeam.bind(this));

    this.router.get('/api/bb3/:name', this.#ensureLoggedIn, async (req,res) => res.json(await accountService.getBB3Account(req.params.name)));

    this.router.get('/api/team/:teamName/bio/:playerName', this.#getBio.bind(this));
    this.router.get('/api/team/:teamName/bio', this.#getBio.bind(this));

    this.router.patch('/api/account/bb3', this.#ensureLoggedIn, this.#updateCoach.bind(this));
    this.router.patch('/api/account/zfl', this.#ensureLoggedIn, this.#updateZflName.bind(this));

    this.router.patch('/api/fixture/:competition/:side/:kit', this.#ensureLoggedIn, this.#updateFixtureKit.bind(this));

    this.router.patch('/api/team/:teamName/bio', this.#ensureLoggedIn, this.#updateBio.bind(this));
    this.router.patch('/api/team/:teamName/bio/:playerName', this.#ensureLoggedIn, this.#updateBio.bind(this));
    this.router.patch('/api/team/:id/kit', this.#ensureLoggedIn, this.#updateKit.bind(this));
    this.router.patch('/api/team/:id/admin/:adminId', this.#ensureLoggedIn, this.#setTeamAdmin.bind(this));
    this.router.patch('/api/competition/:id/release', this.#ensureLoggedIn, this.#releaseMatch.bind(this));

    this.router.post('/upload', util.verifyMaintenanceHeader, this.#updateStats);

    this.router.get('/update',util.verifyMaintenanceToken, async (req,res) => {
      await zflService.updateCompetitions("e3500321-83d6-11ef-be7b-bc24112ec32e");
      res.redirect("/");
    });

    this.router.use((_, res) => {
      res.redirect("/standings");
    });

    this.router.use((err, _, res,next) => {
      console.error(err);
      console.log(err.stack);
      res.redirect("/standings");
    });
  }

  #checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.status(401).send();
  }

  #ensureLoggedIn(req,res,next){
    try{
      if (res.locals.user && res.locals.user.username) { return next(); }
      req.session.returnUrl = req.originalUrl;
      res.redirect("/account/login");
    }
    catch(ex){
      console.error(ex);
    }
  }

  async #loginSucces(user,res){
    res.redirect('/account'); 
  }

  async #getFixtures(_,res,next){
    try {
      let account = null;
      if (res.locals.user) account = await dataService.getZFLAccount({id:res.locals.user.id});
      const isAdmin = account && account.roles && account.roles.some(x => x == "admin");
      const isDM = account && account.roles && account.roles.some(x => x == "dm");
  
      res.render("zfl/fixtures" , {isDM,isAdmin, competitions:await dataService.getZFLCompetitions({year:this.year}) });
    } catch(err){
      next(err);
    }
  }

  async #getFixturesAdmin(_,res,next){
    try{
      let account = null;
      if (res.locals.user) account = await dataService.getZFLAccount({id:res.locals.user.id});
      
      const isAdmin = account && account.roles && account.roles.some(x => x == "admin");
      const isDM = account && account.roles && account.roles.some(x => x == "dm");
      const isAdminMode = isDM || isAdmin;
      const competitions = await dataService.getZFLCompetitions({year:this.year}) ;

      let teamIds = [];
      if (isAdmin) teamIds = await dataService.getZFLTeams({"admin.id":account.coach.id},{projection:{id:1}});

      res.render("zfl/fixtures" , {isDM, isAdmin, teamIds, isAdminMode, competitions});
    } catch(err){
      next(err);
    }
}

  async #getTeam(req,res,next){
    try{
      const team = await dataService.getZFLTeam({id: req.params.id, year:this.year});
      let isAdmin = false;
      let isOwner = false;
      let admins = [];
      if (res.locals.user) {
        const account = await dataService.getZFLAccount({id:res.locals.user.id});
        isAdmin = account.roles.some(x => x == "dm");
        isOwner = account.teamId === team.id;
        admins = await dataService.getZFLAccounts({roles:"admin"});  
      }
  
      team.bio = await dataService.getZFLBio({team:team.name.toLowerCase()});
      for(const player of team.bio?.players || []){
        if (player.content?.length > 0) player.content = markdown.render(player.content);
      }
      if (team.bio?.content && team.bio?.content.length > 0) team.bio.content = markdown.render(team.bio.content);
      
      res.render("zfl/team" , {team, admins, isAdmin, isOwner}); 
    } catch(err){
      next(err);
    }
  }

  async #getAccount(_,res,next){
    try{
      let account = await dataService.getZFLAccount({id:res.locals.user.id});
      if (!account){
        account = {
          id: res.locals.user.id,
          username: res.locals.user.username,
          coach: null,
          zflCoachName: null,
          bio:"",
          teamId: null,
          roles:[]
        } 
        dataService.insertZFLAccount(account);
      }
      let team = null
      if (account.teamId){
        team = await dataService.getZFLTeam({id:account.teamId},{projection:{roster:0}});
      }
      res.render("zfl/account" , {account,team} );
    } catch(err){
      next(err);
    }
  }

  async #getProfile(req,res,next){
    try{
      let account = await dataService.getZFLAccount({"coach.id":req.params.id});
      
      if (!account) return res.redirect("/");
      let team = null;
      if (account.teamId){
        team = await dataService.getZFLTeam({id:account.teamId},{projection:{roster:0}});
      }

      res.render("zfl/profile" , {account, team} );
    } catch(err){
      next(err);
    }
  }

  async #updateBio(req,res){
    try{

      let isAdmin = false;
      let isOwner = false;
      if (res.locals.user) {
        const account = await dataService.getZFLAccount({id:res.locals.user.id});
        const team = await dataService.getZFLTeam({id: account.teamId, year:this.year});
        isAdmin = account.roles.some(x => x == "dm");
        isOwner = team.name.toLowerCase() === req.params.teamName.toLowerCase() ;
      }

      if (!isAdmin && !isOwner) return res.status(401).send("{error:denied}");

      const size = req.params.playerName ? 2000 : 5000;
      const bio = req.body.bio.substr(0,size);
      const playerName = req.params.playerName?.toLowerCase();
      const teamName = req.params.teamName.toLowerCase();

      const team = await dataService.getZFLBio({team:teamName});
      if (!team) await dataService.updateZFLBio({team:teamName},{$set:{team:teamName, players:[]}},{upsert:true});

      if (req.params.playerName && req.params.playerName.length > 0) {
        const exists = await dataService.getZFLBio({team:teamName, "players.name":playerName});
        
        if (exists) await dataService.updateZFLBio({team:teamName, "players.name":playerName},{$set:{"players.$.content":bio}});
        else await dataService.updateZFLBio({team:teamName},{$addToSet:{players:{"name":playerName,"content":bio}}},{upsert:true});
      }
      else await dataService.updateZFLBio({team:teamName},{$set:{content:bio}},{upsert:true});
      return res.status(200).send(markdown.render(bio));
    } catch(err){
      console.log(err);
      return res.status(500).send();
    }
  }

  async #getBio(req,res){
    try{

      const playerName = req.params.playerName?.toLowerCase();
      const teamName = req.params.teamName.toLowerCase();

      if (req.params.playerName && req.params.playerName.length > 0) {
        const bio = await dataService.getZFLBio({team:teamName, "players.name":playerName});
        if (!bio) return res.status(404).send();
        
        const content = bio.players.find(x => x.name === playerName); 
        return res.status(200).send(content.content);
      }
      else {
        const bio = await dataService.getZFLBio({team:teamName});
        if (!bio) return res.status(404).send();
        
        return res.status(200).send(bio.content);
      }
    } catch(err){
      console.log(err);
      return res.status(500).send();
    }
  }


  async #updateKit(req,res){
    try{
      const data = {
        homeKit1: req.body.homeKit1,
        homeKit2: req.body.homeKit2,
        homeKit3: req.body.homeKit3,
        awayKit1: req.body.awayKit1,
        awayKit2: req.body.awayKit2,
        awayKit3: req.body.awayKit3,
      }
      await dataService.updateZFLTeam({id:req.params.id},{$set:{kit:data}});
      res.status(200).send();
    } catch (err){
      console.error(err);
      res.status(500).send();
    }
  }

  async #setTeamAdmin(req,res){
    try{
      let account = await dataService.getZFLAccount({id:res.locals.user.id});
      if (!account.roles || !account.roles.some(x => x == "dm")) {
        res.status(403).send();
      } else {
        account = await dataService.getZFLAccount({"coach.id":req.params.adminId});

        if (account) await dataService.updateZFLTeam({id:req.params.id, year:this.year},{$set:{admin:account.coach}});

        res.status(200).send();
      }
    } catch(err){
      console.log(err);
      res.status(500).send();
    }
  }

  async #updateCoach(req,res) {
    try{
      await dataService.updateZFLAccount({id:req.user.id},{$set:{coach:{id:req.body.id, name:req.body.name, service:req.body.service, displayId:req.body.displayId}}});
      let competitions = await dataService.getZFLCompetitions({year:this.year});
      let standing = competitions[0].standings.find(x => x.coach.id == req.body.id);
      if (!standing) standing = competitions[1].standings.find(x => x.coach.id == req.body.id);
      if (standing) await dataService.updateZFLAccount({id:req.user.id},{$set:{teamId:standing.id}});
   
      res.status(200).send();
    } catch(err){
      console.log(err);
      res.status(500).send();
    }
  }

  async #updateZflName(req,res) {
    try{
      await dataService.updateZFLAccount({id:req.user.id},{$set:{bio:req.body.bio, zflCoachName:req.body.zflCoachName}});
      res.status(200).send();
    } catch(err){
      console.log(err);
      next(err);
    }
    
  }

  async #getMatch(req,res,next){
    try{
      const match = await dataService.getZFLMatch({gameId:req.params.id});
      if (match.released){
        return res.render("zfl/match", {match});
      }

      if (!res.locals.user && !match.released) {
        return res.redirect("/");
      }

      let account = await dataService.getZFLAccount({id:res.locals.user.id});
      if (account.roles.some(x => x == "dm")) {
        return res.render("zfl/match", {match});
      }

      if (account.roles.some(x => x == "admin")) {
        let teamIds =  await dataService.getZFLTeams({"admin.id":account.coach.id},{projection:{id:1}});
        if (teamIds.some(x => x.id == match.homeTeam.id ) || teamIds.some(x => x.id == match.awayTeam.id)) {
          return res.render("zfl/match", {match});
        }
      }  
      res.redirect("/");
    }
    catch(err){
      next(err)
    }
  }

  async #updateStats(req,res){
    try{
      if (!req.body.id) {
        res.status(204).send();
        return;
      }
      await dataService.updateZFLMatch({gameId:req.body.id},{
        $set:{
          "homeTeam.statistics":req.body.home.players,
          "awayTeam.statistics":req.body.away.players, 
          "homeGameResultGain.fanAttendanceRoll":req.body.home.fans, 
          "awayGameResultGain.fanAttendanceRoll":req.body.away.fans
        }
      });
      res.status(200).send();
    } catch (ex){
      console.error(ex);
      res.status(500).send();
    }
  }

  async #releaseMatch(req,res){
    try{
      let account = await dataService.getZFLAccount({id:res.locals.user.id});
      if (!account.roles.some(x => x == "dm")) throw new Error("Insufficient rights");

      zflService.ReleaseAndUpdate(req.params.id);

      res.status(200).send();
    }
    catch(e){
      console.error(e);
      res.status(400).send(e.message);
    }
  }

  async #updateFixtureKit(req,res){
    try{
      const account = await dataService.getZFLAccount({id:res.locals.user.id});
      if (!account.roles.some(x => x == "dm")) throw new Error("Insufficient rights");
  
      const competition = req.params.competition;
      const side = req.params.side;
      const kit = req.params.kit;
  
      const result = side == "home" ? {$set:{"fixtures.$.home.kit":kit}} : {$set:{"fixtures.$.away.kit":kit}};
  
      await dataService.updateZFLCompetition({"fixtures.competition.name":competition},result);
  
      res.status(200).send();
    }
    catch(e){
      console.error(e);
      res.status(400).send(e.message);
    }
  }

}
module.exports = new ZFL();