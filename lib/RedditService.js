"use strict";
const accountService = require("./accountService.js")
  , axios = require("axios")
  , cyanideService = require("./CyanideService.js")
  , dataService = require("./DataService.js").rebbl
  , leagueService = require("./LeagueService.js");


class Reddit {
  constructor(){
    this.coachCount =[];
    this.token = '';
  }    

  _transform(data){
    return Object.entries(data)
    .map(x => `${encodeURIComponent(x[0])}=${encodeURIComponent(x[1])}`)
    .join('&');
  }

  async getToken(){
    var response = await axios.post(`https://www.reddit.com/api/v1/access_token`, 
    this._transform({
      grant_type:'password',
      username:process.env['redditUsername'],
      password:process.env['redditPassword']
    }),
    {
      headers: {
        'User-Agent': 'RebblPlanner Script Scheduling parser',
        'Authorization': 'Basic ' + Buffer.from(process.env["rebblPlannerKey"] + ':' + process.env["rebblPlannerSecret"]).toString('base64')
      }
    });
    setTimeout(() => this.token = "", response.data.expires_in*1000);
    this.token = response.data.access_token;
  }

  async check() {
    await dataService.removeUnplayedGames({"contest_id": { $exists: false }}, { multi: true });

    const contests = await dataService.getUnplayedGames({});
    const contestIds = contests.map(c => c.contest_id);

    const data = await dataService.getSchedules({"contest_id":{$in:contestIds},"status":"played"});
    const ids = data.map(c => c.contest_id);

    await dataService.removeUnplayedGames({"contest_id":{$in:ids}},{multi: true});

    for(let x of ["BIG O", "GMAN", "REL"]){
      await this.getData(x)
    }
  }

  async getData(league) {

    let competitions = await cyanideService.competitions({league: `REBBL - ${league}`,exact:1});

    for(let i = competitions.competitions.length -1; i>=0; i--){
      if (competitions.competitions[i].name.indexOf("Season 17") === -1 || competitions.competitions[i].format === "swiss" ){
        competitions.competitions.splice(i,1);
      }
    }
    
    competitions = competitions.competitions.filter(c => c.status < 2);

    let round = Math.ceil(competitions.reduce((p,c) => p + c.round,0) / competitions.length);

    const search = league + ' Season 17 Week ' + round;
    
    if (this.token === ""){
      await this.getToken();
    }

    const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: "base"});
    const response = await axios.get(`https://oauth.reddit.com/r/rebbl/search?q=${encodeURIComponent(search)}&limit=2&restrict_sr=true&sort=new`, {
      headers: {
        'Authorization': 'Bearer ' + this.token,
        'User-Agent': 'RebblPlanner Script Scheduling parser'
      }
    });

    let parsed = response.data.data.children[0].data,
      threadId = parsed.id,
      title = parsed.title;

    if (collator.compare(title,search) !== 0){
        parsed = response.data.data.children[1].data;
        threadId = parsed.id;
        title = parsed.title;
    }

    if (collator.compare(title,search) === 0) {
        await this.getComments(threadId, league, round);
    }
  }

  async getComments(id,league, round) {
    if (this.token === ""){
      await this.getToken();
    }

    const response = await axios.get(`https://oauth.reddit.com/r/rebbl/comments/${id}?limit=500`,{
      headers: {
        'Authorization': 'Bearer ' + this.token,
        'User-Agent': 'RebblPlanner Script Scheduling parser'
      }
    });

    const comments = response.data[1];
    this.parseComments(comments);

    this.getRoundData(league, round);
  }

  parseComments(comment) {
    if (Array.isArray(comment)) {
      for (var x = 0; x < comment.length; x++) {
        this.parseComment(comment[x]);
      }
    } else {
      const len = comment.data.children.length;
      for (var i = 0; i < len; i++) {
        this.parseComment(comment.data.children[i]);
      }
    }
  }

  parseComment(comment) {
    const c = this.coachCount.find(
      function (e) {
          return e.author === comment.data.author;
      });

    if (!c) {
      if (comment.data.author) {
        this.coachCount.push({ author: comment.data.author, link: comment.data.permalink });
      }
    }
    if (comment.data.replies && comment.data.replies !== "") this.parseComments(comment.data.replies);
  }

  async getRoundData(league, round) {
    const l = new RegExp(`REBBL - ${league}`, "i");
    let c = new RegExp(`^Season 17`, "i");
    let data = await leagueService.searchLeagues({"league":{"$regex":l},"competition":{"$regex":c},"status":"scheduled","round":round});
    c = new RegExp(`^Season 17|^S17`, "i");
    let splitData = await leagueService.searchLeagues({"league":{"$regex":l},"competition":{"$regex":c},"status":"scheduled","round":round-8});

    data = data.concat(splitData);

    this.parseRoundData(data);
  }

  async parseRoundData(matchData) {
    let result = await Promise.all(matchData.map(
      async function (match) {
        let c = new RegExp(`^${match.opponents[0].coach.name}$`, "i");
        const coach1 = await accountService.searchAccount({"coach":{"$regex":c}});
        c = new RegExp(`^${match.opponents[1].coach.name}$`, "i");
        const coach2 = await accountService.searchAccount({"coach":{"$regex":c}});

        const reddit1 = this.coachCount.find(function (e) {
            return coach1 ? e.author.toLowerCase() === coach1.reddit.toLowerCase() : false;
        });
        const reddit2 = this.coachCount.find(function (e) {
            return coach2 ? e.author.toLowerCase() === coach2.reddit.toLowerCase() : false;
        });

        //const excludeTeam = (match.opponents[0].team.name.toLowerCase().indexOf("[admin]") > -1) || (match.opponents[1].team.name.toLowerCase().indexOf("[admin]") > -1)
        //if (excludeTeam) return false;

        return {
            league:match.league,
            competition: match.competition,
            contest_id:match.contest_id,
            round:match.round,
            team1: match.opponents[0].team.name,
            coach1: match.opponents[0].coach.name,
            team2: match.opponents[1].team.name,
            coach2: match.opponents[1].coach.name,
            is1: reddit1,
            is2: reddit2,
            link1: reddit1 ? 'https://www.reddit.com' + reddit1.link : undefined,
            link2: reddit2 ? 'https://www.reddit.com' + reddit2.link : undefined
        };
      }.bind(this)));

    result = result.sort();    
    if (result.indexOf(false) > -1)
      result = result.slice(0, result.indexOf(false));

    this.updateTables(result);
  }

  updateTables(data) {

      data.map(async m => {
          dataService.updateUnplayedGame({"contest_id":m.contest_id},m,{upsert:true});
      });
  }

  async getUnplayedGames() {
    let data = await dataService.getUnplayedGames({});
    return data.sort((a,b) => {
      if (a.league > b.league) return 1;
      if (a.league < b.league) return -1;
      if (a.competition > b.competition) return 1;
      if (a.competition < b.competition) return -1;
      if (a.coach1 > b.coach1) return 1;
      if (a.coach1 < b.coach1) return -1;
      return 0;
    });
  }

  async getAnnouncements() {
    if (this.token === ""){
      await this.getToken();
    }

    const response = await axios.get(`https://oauth.reddit.com/r/rebbl/search?q=flair%3AOfficial_post&restrict_sr=on&sort=new&t=all&limit=10`,{
      headers: {
        'Authorization': 'Bearer ' + this.token,
        'User-Agent': 'RebblPlanner Script Scheduling parser'
      }
    });

    const parsed = response.data.data.children;

    if (parsed.length > 0){
      dataService.deleteAnnouncements({});
        
      parsed.map(p => {
        let announcement = {
          text :p.data.selftext,
          title : p.data.title,
          url :p.data.url,
          date: p.data.created
        };
        dataService.insertAnnouncement(announcement);
      });
    }
  }
}

module.exports = new Reddit();
