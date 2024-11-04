'use strict';
const 
    dataService = require("../../lib/DataService.js").rebbl
  , datingService = require("../../lib/DatingService.js")
  , division = require(`./division.js`)
  , express = require('express')
  , league =require(`./league.js`)
  , standings = require("./standings.js")  
  , util = require("../../lib/util.js");



class Rebbl{
	constructor(){
		this.router = express.Router({mergeParams:true});
	}

  _mockContest(match){

    const contest = {};
    contest.match_uuid = match.uuid;
    contest.opponents = [{
      coach:{
        id: match.coaches[0].id,
        name: match.coaches[0].name,
      },
      team:{
        name: match.match.teams[0].teamname,
        logo: match.match.teams[0].teamlogo,
        score: match.match.teams[0].score,
      }
    },{
      coach:{
        id: match.coaches[1].id,
        name: match.coaches[1].name,
      },
      team:{
        name: match.match.teams[1].teamname,
        logo: match.match.teams[1].teamlogo,
        score: match.match.teams[1].score,
      }
    }];
    contest.league = match.match.leaguename;
    contest.competition = match.  match.competitionname;

    contest.winner = null;
    return contest;
  }

  async _root(req, res) {
    let data = {company:req.params.company};
    data.announcements = await dataService.getAnnouncements({});
    let c = new RegExp(`^(^Season 25)|(^REL Rampup)|(^GMAN Rampup)`, "i");
    let l = new RegExp(`^(REBBL - )|(REL Rampup)|(GMAN Rampup)`, "i");
    let s = new RegExp("(The REBBL Rabble Mixer)|(XScessively Elfly League)|(\[REBBL] One Minute League)|(REBBLL )","i");
    let d = await datingService.all();

    let docs = {};
    const now = new Date(Date.now());
    switch (data.company){
      case "rebbl":
        docs = await dataService.getSchedulesChain({ "league":{"$regex":l}, "competition":{"$regex":c} }).sort({ match_uuid: -1 }).limit(20).toArray();
    
        data.rebbl = docs.sort((a,b) => a.match_uuid > b.match_uuid ? -1 : 1);
    
        docs = await dataService.getSchedulesChain({ "league":{"$regex":s} }).sort({ match_uuid: -1 }).limit(20).toArray();
        data.sides = docs.sort((a,b) => a.match_uuid > b.match_uuid ? -1 : 1);
        
        d = d.filter(a => new Date(a.date) > now ).sort((a,b) => a.date < b.date ? -1 : 1).splice(0,20);
    
        data.upcoming = await dataService.getSchedules({"contest_id": {$in:[...new Set(d.map(x => x.id))]}});
    
        await Promise.all(data.upcoming.map(async function(match) {
          let date = d.find(s => s.id === match.contest_id);
          match.date = date.date;
          if(date.stream)
          match.stream=date.stream;
        }));
    
        data.upcoming = data.upcoming.filter(a => a.league.toLowerCase().indexOf("rebbrl") === -1).sort((a,b) => a.date < b.date ? -1 : 1);
  
        break;
      case "rebbrl":
        l = new RegExp(`^(ReBBRL College)`, "i");
    
        docs = await dataService.getMatchesChain({ "match.leaguename":{"$regex":l}}).sort({ uuid: -1 }).limit(20).toArray();
    
        data.rebbl = docs.map(this._mockContest).sort((a,b) => a.uuid > b.uuid ? -1 : 1);

        s = new RegExp("^(ReBBRL Minors)","i");
        docs = await dataService.getMatchesChain({ "match.leaguename":{"$regex":s} }).sort({ uuid: -1 }).limit(20).toArray();
        data.sides = docs.map(this._mockContest).sort((a,b) => a.uuid > b.uuid ? -1 : 1);
        
        d = d.filter(a => new Date(a.date) > now ).sort((a,b) => a.date < b.date ? -1 : 1).splice(0,20);
    
        data.upcoming = await dataService.getSchedules({"contest_id": {$in:[...new Set(d.map(x => x.id))]}});
    
        await Promise.all(data.upcoming.map(async function(match) {
          let date = d.find(s => s.id === match.contest_id);
          match.date = date.date;
          if(date.stream)
          match.stream=date.stream;
        }));
    
        data.upcoming = data.upcoming.filter(a => a.league.toLowerCase().indexOf("rebbrl") > -1) .sort((a,b) => a.date < b.date ? -1 : 1);
        break;
      default:
        data.rebbl = [];
        data.sides = [];
        data.upcoming = [];
        break;
    }


    res.render("rebbl/index", {data:data});
  }


  routesConfig(){
   
    //handle old routes
    this.router.get('/team/*', (req,res) => res.redirect(301,`../../${req.url.split("/").splice(1).join("/") }`) );
    this.router.get('/coach/*', (req,res) => res.redirect(301,`../../${req.url.split("/").splice(1).join("/") }`) );

    this.router.use('/counter', require(`./counter.js`));
    this.router.use('/match', require(`./match.js`));
    this.router.use('/stunty', require(`./stunty.js`));
    this.router.use('/ongoing', require(`./ongoing.js`));
    this.router.use('/upcoming', require(`./upcoming.js`));
    this.router.use('/standings', new standings().routesConfig());
    this.router.use('/old_team', require(`./old_team.js`));
    this.router.use('/playoffs', require(`./playoffs.js`));
    this.router.use('/:league', new league().routesConfig());
    this.router.use('/:league/:division', new division().routesConfig());

    this.router.get("/", util.cache(10*60), this._root.bind(this));


    return this.router;
  }
}

module.exports = Rebbl;