"use strict";
const 
    dataService = require("../lib/DataService.js").rebbl
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
	
  async _root(req, res, next) {
    let data = {}
    data.announcements = await dataService.getAnnouncements({});
    let c = new RegExp(`^(^Season 12)|(^REL Rampup)|(^GMAN Rampup)`, "i");
    let l = new RegExp(`^(REBBL - )|(REL Rampup)|(GMAN Rampup)`, "i");

    let docs = await dataService.getSchedulesChain({ "league":{"$regex":l}, "competition":{"$regex":c} }).sort({ match_uuid: -1 }).limit(20).toArray();

    data.rebbl = docs.sort((a,b) => a.match_uuid > b.match_uuid ? -1 : 1);;

    let s  = new RegExp("^(REBBRL)","i")
    docs = await dataService.getSchedulesChain({ "league":{"$regex":s} }).sort({ match_uuid: -1 }).limit(20).toArray();
    data.sides = docs.sort((a,b) => a.match_uuid > b.match_uuid ? -1 : 1);
    
    let d = await datingService.all();
    const now = new Date(Date.now());
    d = d.filter(a => new Date(a.date) > now ).sort((a,b) => a.date < b.date ? -1 : 1).splice(0,20);

    

    data.upcoming = await dataService.getSchedules({"contest_id": {$in:[...new Set(d.map(x => x.id))]}})

    await Promise.all(data.upcoming.map(async function(match) {
      let date = d.find(s => s.id === match.contest_id);
      match.date = date.date;
      if(date.stream)
      match.stream=date.stream;
    }));

    data.upcoming = data.upcoming.sort((a,b) => a.date < b.date ? -1 : 1)

    res.render("rebbl/index", {data:data});
  }



	routesConfig(){
		this.router.use("/api", new api().routesConfig() );
    this.router.use("/maintenance", new maintenance().routesConfig());
    this.router.use("/cripple", new cripple().routesConfig());
    this.router.use("/account", new account().routesConfig());
    this.router.use("/bloodbowl", new bloodbowl().routesConfig());
    this.router.use("/signup", new signup().routesConfig());
    this.router.use("/auth", new auth().routesConfig());
    this.router.use("/admin", util.ensureAuthenticated, util.hasRole("admin"), new admin().routesConfig());

    this.router.use("/clan",new clan().routesConfig())

    this.router.use("/:company", new rebbl().routesConfig());

    this.router.get("/", util.checkCache, this._root);
  
    return this.router;
  }
}
module.exports = Routes;