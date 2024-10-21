'use strict';

const express = require("express")
, cache = require("memory-cache")
, passport = require("passport")
, accountService = require("../../lib/accountService.js")
, dataService = require("../../lib/DataServiceBB3.js").rebbl3
, zflService = require("../../lib/ZFLService.js")
, util = require("../../lib/util.js");

class ZFL{
	constructor(){
		this.router = express.Router();
    this.year = 2494;

    this.router.use((req, res, next) => { res.locals.user = req.isAuthenticated() ? req.user : null; return next();});


    this.router.get("/login", passport.authenticate("discord"));
    this.router.get("/logout", (req, res) => {req.logout(null, _ => _);res.redirect("/");});

    this.router.get('/discord/callback', passport.authenticate('discord', {failureRedirect: '/login'}), async (req, res) =>  await this.#loginSucces(req.user,res)); // auth success

    this.router.get("/", async (_,res) => res.render("zfl/standings" , {competitions:await dataService.getZFLCompetitions({year:this.year}), accounts:await dataService.getZFLAccounts({})}) );

    this.router.get("/account", this.#checkAuth, this.#getAccount );
    this.router.get("/profile/:id", this.#getProfile );

    this.router.get("/standings", async (_,res) => res.render("zfl/standings" , {competitions:await dataService.getZFLCompetitions({year:this.year}), accounts:await dataService.getZFLAccounts({})}));
    this.router.get("/playerstats", this.#getPlayerStats.bind(this));
    this.router.get('/fixtures',  this.#getFixtures.bind(this));
    this.router.get('/fixtures/admin', this.#ensureLoggedIn, this.#getFixturesAdmin.bind(this));

    this.router.get('/match/:id', this.#getMatch);

    this.router.get('/team/:id',  this.#getTeam.bind(this));

    this.router.get('/api/bb3/:name', this.#ensureLoggedIn, async (req,res) => res.json(await accountService.getBB3Account(req.params.name)));
    this.router.patch('/api/account/bb3', this.#ensureLoggedIn, this.#updateCoach.bind(this));
    this.router.patch('/api/account/zfl', this.#ensureLoggedIn, this.#updateZflName.bind(this));
    this.router.patch('/api/team/:id/kit', this.#ensureLoggedIn, this.#updateKit.bind(this));
    this.router.patch('/api/team/:id/admin/:adminId', this.#ensureLoggedIn, this.#setTeamAdmin.bind(this));
    this.router.patch('/api/competition/:id/release', this.#ensureLoggedIn, this.#releaseMatch.bind(this));

    this.router.post('/upload', util.verifyMaintenanceHeader, this.#updateStats);

    this.router.get('/update',util.verifyMaintenanceToken, async (req,res) => {
      await zflService.updateCompetitions("9a2ffa7c-ab2a-11ee-a745-02000090a64f");
      await zflService.updateCompetitions("e3500321-83d6-11ef-be7b-bc24112ec32e");
      res.redirect("/");
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

  async #getFixtures(_,res){
    let account = null;
    if (res.locals.user) account = await dataService.getZFLAccount({id:res.locals.user.id});
    const isAdmin = account && account.roles && account.roles.some(x => x == "admin");
    const isDM = account && account.roles && account.roles.some(x => x == "dm");
    
    

    res.render("zfl/fixtures" , {isDM,isAdmin, competitions:await dataService.getZFLCompetitions({year:this.year}) });
  }

  async #getFixturesAdmin(_,res){
    let account = null;
    if (res.locals.user) account = await dataService.getZFLAccount({id:res.locals.user.id});
    
    const isAdmin = account && account.roles && account.roles.some(x => x == "admin");
    const isDM = account && account.roles && account.roles.some(x => x == "dm");
    const isAdminMode = isDM || isAdmin;
    const competitions = await dataService.getZFLCompetitions({year:this.year}) ;

    let teamIds = [];
    if (isAdmin) teamIds = await dataService.getZFLTeams({"admin.id":account.coach.id},{projection:{id:1}});

    res.render("zfl/fixtures" , {isDM, isAdmin, teamIds, isAdminMode, competitions});
  }

  async #getTeam(req,res){
    const team = await dataService.getZFLTeam({id: req.params.id, year:this.year});
    let isAdmin = false;
    let admins = [];
    if (res.locals.user) {
      const account = await dataService.getZFLAccount({id:res.locals.user.id});
      isAdmin = account.roles.some(x => x == "dm");
      admins = await dataService.getZFLAccounts({roles:"admin"});  
    }
    
    res.render("zfl/team" , {team, admins, isAdmin}); 
  }

  async #getAccount(_,res){
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
  }

  async #getProfile(req,res){
    let account = await dataService.getZFLAccount({"coach.id":req.params.id});
    let team = null;
    if (account.teamId){
      team = await dataService.getZFLTeam({id:account.teamId},{projection:{roster:0}});
    }

    res.render("zfl/profile" , {account, team} );
  }


  async #updateKit(req,res){
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
  }

  async #setTeamAdmin(req,res){
    let account = await dataService.getZFLAccount({id:res.locals.user.id});
    if (!account.roles || !account.roles.some(x => x == "dm")) {
      res.status(403).send();
    } else {
      account = await dataService.getZFLAccount({"coach.id":req.params.adminId});

      if (account) await dataService.updateZFLTeam({id:req.params.id, year:this.year},{$set:{admin:account.coach}});

      res.status(200).send();
    }

  }

  async #updateCoach(req,res) {
    await dataService.updateZFLAccount({id:req.user.id},{$set:{coach:{id:req.body.id, name:req.body.name, service:req.body.service, displayId:req.body.displayId}}});
    let competitions = await dataService.getZFLCompetitions({year:this.year});
    let standing = competitions[0].standings.find(x => x.coach.id == req.body.id);
    if (!standing) standing = competitions[1].standings.find(x => x.coach.id == req.body.id);
    if (standing) await dataService.updateZFLAccount({id:req.user.id},{$set:{teamId:standing.id}});
 
    res.status(200).send();
  }
  async #updateZflName(req,res) {
    await dataService.updateZFLAccount({id:req.user.id},{$set:{bio:req.body.bio, zflCoachName:req.body.zflCoachName}});
    res.status(200).send();
  }

  async #getMatch(req,res){
    try{
      const match = await dataService.getZFLMatch({gameId:req.params.id});
      if (match.released){
        res.render("zfl/match", {match});
        return;
      }

      if (!res.locals.user && !match.released) {
        res.redirect("/");
        return;
      }

      let account = await dataService.getZFLAccount({id:res.locals.user.id});
      if (account.roles.some(x => x == "dm")) {
        res.render("zfl/match", {match});
        return;
      }

      if (account.roles.some(x => x == "admin")) {
        let teamIds =  await dataService.getZFLTeams({"admin.id":account.coach.id},{projection:{id:1}});
        if (teamIds.some(x => x.id == match.homeTeam.id ) || teamIds.some(x => x.id == match.awayTeam.id)) {
          res.render("zfl/match", {match});
          return;
        }
      }  

      res.redirect("/");
    }
    catch(e){
      console.error(e);
      res.status(400).send(e.message);
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

  async #getPlayerStats(_,res){

    let cachedBody = cache.get("zfl_playerstats");
    if (cachedBody) return res.render("zfl/playerstats", cachedBody);

    const sacks = await dataService.getZFLStats({year:this.year,Sacks:{$gt:0}},{},{Sacks:-1},10);
    const passes = await dataService.getZFLStats({year:this.year,PassCompletions:{$gt:0}},{},{PassCompletions:-1},10);
    const touchdowns = await dataService.getZFLStats({year:this.year,TouchdownsScored:{$gt:0}},{},{TouchdownsScored:-1},10);
    const spp = await dataService.getZFLStats({year:this.year,SppEarned:{$gt:0}},{},{SppEarned:-1},10);
    const casInflicted = await dataService.getZFLStats({year:this.year,CasInflicted:{$gt:0}},{},{CasInflicted:-1},10);
    const casSustained = await dataService.getZFLStats({year:this.year,CasSustained:{$gt:0}},{},{CasSustained:-1},10);
    const foulsInflicted = await dataService.getZFLStats({year:this.year,FoulsInflicted:{$gt:0}},{},{FoulsInflicted:-1},10);
    const foulsSustained = await dataService.getZFLStats({year:this.year,FoulsSustained:{$gt:0}},{},{FoulsSustained:-1},10);
    const surfsInflicted = await dataService.getZFLStats({year:this.year,SurfsInflicted:{$gt:0}},{},{SurfsInflicted:-1},10);
    const surfsSustained = await dataService.getZFLStats({year:this.year,SurfsSustained:{$gt:0}},{},{SurfsSustained:-1},10);
    const kills = await dataService.getZFLStats({year:this.year,Sacks:{$gt:0}},{},{Sacks:-1},10);
    const dodgeTurnovers = await dataService.getZFLStats({year:this.year,DodgeTurnovers:{$gt:0}},{},{DodgeTurnovers:-1},10);
    const dubskullsRolled = await dataService.getZFLStats({year:this.year,DubskullsRolled:{$gt:0}},{},{DubskullsRolled:-1},10);
    const gamesPlayed = await dataService.getZFLStats({year:this.year,GamesPlayed:{$gt:0}},{},{GamesPlayed:-1},10);

    const data = {sacks,passes,touchdowns,spp,casInflicted,casSustained,foulsInflicted,foulsSustained,surfsInflicted,surfsSustained,kills,dodgeTurnovers,dubskullsRolled,gamesPlayed};
    cache.put("zfl_playerstats", data,60*60*1000);

    res.render("zfl/playerstats",data);

  }

}
module.exports = new ZFL();