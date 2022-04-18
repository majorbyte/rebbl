"use strict";
const 
  coach = require(`./coach/coach.js`)
  , dataService = require("../lib/DataService.js").rebbl
  , datingService = require("../lib/DatingService.js")
  , express = require("express")
  , util = require("../lib/util.js")
  /* routes  */
  , api = require("./api/api.js")
  , maintenance = require("./maintenance/maintenance.js")
  , rebbl = require("./rebbl/rebbl.js")
  , cripple = require("./cripple/cripple.js")
  , account = require("./account/account.js")
  , bloodbowl = require("./bloodbowl/bloodbowl.js")
  , signup = require("./signup/signup.js")
  , auth = require("./account/auth.js")
  , admin = require("./admin/admin.js")
  , clan = require("./clan/clan.js");


class Routes{
	constructor(){
		this.router = express.Router();
	}
	
  async _root(req, res) {
    let data = {};
    data.announcements = await dataService.getAnnouncements({});
    let c = new RegExp(`^(^Season 19)|(^REL Rampup)|(^GMAN Rampup)`, "i");
    let l = new RegExp(`^(REBBL - )|(REL Rampup)|(GMAN Rampup)`, "i");

    let docs = await dataService.getSchedulesChain({ "league":{"$regex":l}, "competition":{"$regex":c} }).sort({ match_uuid: -1 }).limit(20).toArray();

    data.rebbl = docs.sort((a,b) => a.match_uuid > b.match_uuid ? -1 : 1);

    let s = new RegExp("^(REBBRL)","i");
    docs = await dataService.getSchedulesChain({ "league":{"$regex":s} }).sort({ match_uuid: -1 }).limit(20).toArray();
    data.sides = docs.sort((a,b) => a.match_uuid > b.match_uuid ? -1 : 1);
    
    let d = await datingService.all();
    const now = new Date(Date.now());
    d = d.filter(a => new Date(a.date) > now ).sort((a,b) => a.date < b.date ? -1 : 1).splice(0,20);

    

    data.upcoming = await dataService.getSchedules({"contest_id": {$in:[...new Set(d.map(x => x.id))]}});

    let clan = await dataService.getSchedules({"matches.contest_id": {$in:[...new Set(d.map(x => x.id))]}},{projection:{"matches.$":1}});
    
    if(clan.length > 0){
      clan.map(x => x.matches.map(m => data.upcoming.push(m)));
  }

    await Promise.all(data.upcoming.map(async function(match) {
      let date = d.find(s => s.id === match.contest_id);
      if (!date) return;
      match.date = date.date;
      if(date.stream)
      match.stream=date.stream;
    }));

    data.upcoming = data.upcoming.sort((a,b) => a.date < b.date ? -1 : 1);

    res.render("rebbl/index", {data:data});
  }

  async _perpetual(req, res){
    res.render('perpetual/standings');
  }

	routesConfig(){
		this.router.use("/api", new api().routesConfig() );
    this.router.get("/test", (req,res) => res.render("relayout"));
    this.router.get("/guides", (req,res) => res.render("guides"));
    this.router.use("/maintenance", new maintenance().routesConfig());
    this.router.use("/cripple", new cripple().routesConfig());
    this.router.get("/perpetual", util.cache(1), this._perpetual);
    this.router.use("/account", new account().routesConfig());
    this.router.use("/bloodbowl", new bloodbowl().routesConfig());
    this.router.use("/signup", new signup().routesConfig());
    this.router.use("/auth", new auth().routesConfig());
    this.router.use("/admin", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), new admin().routesConfig());

    this.router.get('/chaos', async function(req, res){
      try{
        res.render('chaos/counter',null );
      } catch(err){
        console.log(err);
      }
    });

    this.router.use("/clan",new clan().routesConfig());

    this.router.use('/coach', new coach().routesConfig());
    this.router.use('/team', require(`./team/team.js`));

    this.router.use("/:company", new rebbl().routesConfig());


    this.router.get("/", util.cache(10*60), this._root);

  
    return this.router;
  }
}
module.exports = Routes;