"use strict";

const Datastore = require('./async-nedb.js')
  , Cyanide= require('./cyanide.js');


class DataHandler{
  constructor(){
    this.matches = new Datastore.datastore('datastore/matches.db');
    this.schedule = new Datastore.datastore('datastore/schedule.db');
    this.coaches = new Datastore.datastore('datastore/coaches.db');
    this.teams = new Datastore.datastore('datastore/teams.db');

    this.matches.loadDatabase();
    this.schedule.loadDatabase();
    this.coaches.loadDatabase();
    this.teams.loadDatabase();

    this.cyanide = new Cyanide.Cyanide(process.env['cyanideKey'])
    this._rounds = null;
  }


  async rounds(){
    if (this._rounds === null){
      let matches =  await this.schedule.find({});
      this._rounds = await [...new Set(matches.map(item => item.round))];
    }
    return this._rounds;
  }

  getMatch(id){
    try {
      this.matches.find({uuid: id}, async function (err, docs) {
        if (docs.length > 0) return; //already exists

        let match = await this.cyanide.match({match_id: id});

        this.matches.insert(match, function (err, newMath) { });
      });
    } catch(e) {
      //todo proper logging
    }
  }

  saveCoach(opponent){
    this.coaches.find({id: opponent.coach.id}, function (err, result) {
      if (result.length > 0) return;

      //not found --> save coach
      const team = Object.assign({}, opponent.team);
      delete team.score;
      delete team.death;

      const coach = Object.assign({}, opponent.coach);
      coach.team = team;
      coach.score = 0;
      coach.touchdownDiff = 0;
      this.coaches.insert(coach, function (err, coach) {});
    });
  }


  async getLeagueData(round){
    try {
      const data = await this.cyanide.contests({league : "ReBBL World Cup 2018", status:"*", exact: 0});

      data.upcoming_matches.forEach(function (match) {
        match.round = round;

        //Find & save the home coach
        saveCoach(match.opponents[0]);

        //Save the away coach
        saveCoach(match.opponents[1]);

        this.schedule.find({contest_id: match.contest_id}, function (err, docs) {
          if (docs.length === 0) {
            this.schedule.insert(match, function (err, newMatch) {});
          } else if (match.status === "played" && docs[0].match_uuid === "1000000000") {
            this.schedule.update({contest_id: match.contest_id}, match);
          }
        });

        if (match.match_uuid === "1000000000" ) return; //not played yet

        getMatch(match.match_uuid);
      });
    }
    catch (e){
      //todo proper logging
    }
    this.updateCoachScoringPoints();
  }

  updateCoachScoringPoints() {
    this.coaches.find({}, function (err, coaches) {
      coaches.forEach(function (coach) {
        coach.score = 0;
        coach.touchdownDiff = 0;
        this.matches.find({"match.coaches.idcoach": coach.id}, function (err, matches) {

          matches.forEach(function (match) {

            const scoreHome = match.match.teams[0].score;
            const scoreAway = match.match.teams[1].score;

            const homeId = match.match.teams[0].idteamlisting;

            const homeTeam = match.teams.find(function (e) {
              return e.id === homeId
            });

            if (scoreAway === scoreHome) coach.score++;

            if (homeTeam.idcoach == coach.id && scoreHome > scoreAway) coach.score += 3;

            if (homeTeam.idcoach != coach.id && scoreHome < scoreAway) coach.score += 3;

            if (homeTeam.idcoach == coach.id) {
              coach.touchdownDiff += (scoreHome - scoreAway);
            } else {
              coach.touchdownDiff += (scoreAway - scoreHome);
            }
          });


          this.coaches.update({id: coach.id}, {
            $set: {
              "score": coach.score,
              "touchdownDiff": coach.touchdownDiff
            }
          }, {upsert: false}, function (err, num) {
          });

        });
      });
    });
  }

  async downloadTeam(t){
    try{
      console.log(`getting team ${t.team}`);
      let team = await this.cyanide.team({team: t.id});

      delete team.meta;
      delete team.url;

      this.teams.insert(team.team, function (err, t) {
        console.log(`inserted: ${err}`);
      });
    } catch(e){
      //todo proper logging
      console.log(e);
    }
  }

  async downloadTeams(league){
    try{
      let teams = await this.cyanide.teams({league:league});

      teams.teams.forEach(downloadTeam);

    } catch(e){
      //todo proper logging
      console.log(e);
    }
  }

  checkTeams(){
    this.teams.find({}, function(err, teams){
      if (teams.length === 0) {
        let leagues= ['ReBBL World Cup 2018', 'ReBBL World Cup 2018 - 2', 'ReBBL World Cup 2018 - 3', 'ReBBL World Cup 2018 - 4'];
        leagues.forEach(function(league){
          downloadTeams(league);
        });
      }
    })
  }


  _arrayTo2DArray (list, howMany) {
    var result = [], input = list.slice(0);
    while(list[0]) {
      result.push(list.splice(0, howMany));
    }
    return result;
  }

//

  async getSchedules(){
    let coaches = await this.coaches.find({})
    coaches = coaches.sort(function(a,b){
      if (a.score > b.score) return -1;
      if (a.score < b.score) return 1;

      if (a.touchdownDiff > b.touchdownDiff) return -1;
      if (a.touchdownDiff < b.touchdownDiff) return 1;

      return 0
    });

    const top = coaches.splice(0,1)[0];
    return {top: top, coaches2d: this._arrayTo2DArray(coaches, 43) };
  }

  async getCoach(_id, coachId=Number(_id)){
    let coach = await this.coaches.findOne({id: coachId});
    let team = await this.teams.findOne({"coach.id": coachId});
    let matches = await this.schedule.find({"opponents.coach.id" : coachId});

    return {coach: coach, matches: matches, team: team};
  }

  async getMatches(_id, round=Number(_id)){
    let matches = await this.schedule.find({round: round});

    matches = await matches.sort(function(a,b){
      if (a.match_uuid < b.match_uuid ) return 1;
      if (b.match_uuid < a.match_uuid) return -1;
      return 0;
    });

    return {matches: matches};
  }

  async getMatchDetails(_id, matchId=String(_id)){
    let match = await this.matches.findOne({uuid: matchId});

    function _sortPlayers(roster){
      return roster.sort(function(a,b){
        if (a.number > b.number) return 1;
        if (a.number < b.number) return -1;
      });
    }

    match.match.teams[0].roster = _sortPlayers(match.match.teams[0].roster);
    match.match.teams[1].roster = _sortPlayers(match.match.teams[1].roster);

    let rosterSize = Math.max(match.match.teams[1].roster.length, match.match.teams[0].roster.length);
    return  {"match": match.match, rosterSize:rosterSize};
  }
}

module.exports = new DataHandler();