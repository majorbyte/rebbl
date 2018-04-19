"use strict";

const Datastore = require('./async-nedb.js')
  , Cyanide= require('./cyanide.js')
  , cache = require('memory-cache');


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

    this.cyanide = new Cyanide();
    this._rounds = null;
  }


  async rounds(){
    if (this._rounds === null){
      let matches =  await this.schedule.find({});
      this._rounds = await [...new Set(matches.map(item => item.round))];
    }
    return this._rounds;
  }

  async getMatch(id){
    try {

      let exist = await this.matches.findOne({uuid: id});

      if (exist) return; //already exists

      let match = await this.cyanide.match({match_id: id});

      await this.matches.insert(match);

      await this.updateCoachScoringPoints(match.coaches[0].id);
      await this.updateCoachScoringPoints(match.coaches[1].id);
      //todo find a better way. coach 0 is depended on strength of coach 1 
      await this.updateCoachScoringPoints(match.coaches[0].id);

      cache.del(`__coach__/coach/${match.coaches[0].id}`);
      cache.del(`__coach__/coach/${match.coaches[1].id}`);
      cache.del(`__coach__/coach`);

      cache.del(`__match__/match/${id}`);

    } catch(e) {
      //todo proper logging
      console.log(e);
    }
  }

  async saveCoach(opponent){

    let exits = await this.coaches.findOne({id: opponent.coach.id});

    if (exits) return;

    //not found --> save coach
    const team = Object.assign({}, opponent.team);
    delete team.score;
    delete team.death;

    const coach = Object.assign({}, opponent.coach);
    coach.team = team;
    coach.score = 0;
    coach.touchdownDiff = 0;
    await this.coaches.insert(coach);
  }


  async _parseContest(match, round){
    if(round) match.round = round;

    //Find & save the home coach
    await this.saveCoach(match.opponents[0]);

    //Save the away coach
    await this.saveCoach(match.opponents[1]);

    let contest = await this.schedule.findOne({contest_id: match.contest_id});

    if (!contest) {
      await this.schedule.insert(match);
    } else if (match.status === "played" && contest.match_uuid === "1000000000") {
      await this.schedule.update({contest_id: match.contest_id}, match);
    }

    if (match.match_uuid === "1000000000" ) return; //not played yet

    await this.getMatch(match.match_uuid);
  }

  async getLeagueData(round){
    try {
      const contests = await this.cyanide.contests({league : "ReBBL World Cup 2018", status:"*", exact: 0, v: 1})

      await Promise.all(contests.upcoming_matches.map(async function(contest){
        await this._parseContest(contest, round);
      }, this));

      //
      cache.del(`__round__/round/${round}`);
    }
    catch (e){
      //todo proper logging
      console.log(e);
    }

    //compact databases
    this.matches.loadDatabase();
    this.schedule.loadDatabase();
    this.coaches.loadDatabase();
    this.teams.loadDatabase();
  }

  async _calculateCoachStats (coach) {
    coach.score = 0;
    coach.touchdownDiff = 0;
    coach.strength=0;

    //Using A M Z for W D L, this will make sorting easier.
    //Could have used some other arbitrary identifier as well
    coach.history = "";

    let lossCount = 0;
    let matchCount = 0;

    let matches = await this.matches.find({"match.coaches.idcoach": coach.id});


    if (!matches) return;


    for (let index = 0; index < matches.length; index++){
      let match = matches[index];
      const scoreHome = match.match.teams[0].score;
      const scoreAway = match.match.teams[1].score;

      const homeId = match.match.teams[0].idteamlisting;

      const homeTeam = match.teams.find(function (e) {
        return e.id === homeId
      });

      if (scoreAway === scoreHome){
        coach.score++;
        coach.history += "M";
        matchCount++ ;
      } else if ((homeTeam.idcoach == coach.id && scoreHome > scoreAway) || (homeTeam.idcoach != coach.id && scoreHome < scoreAway)){
        coach.score += 3;
        coach.history += "A";
        matchCount++;
      } else {
        coach.history += "Z";
        if (lossCount < 2){
          matchCount++;
          lossCount++;
        }
      }

      if (homeTeam.idcoach == coach.id) {
        coach.touchdownDiff += (scoreHome - scoreAway);
      } else {
        coach.touchdownDiff += (scoreAway - scoreHome);
      }
    }

    coach.strength = matchCount > 0 ? coach.score / (matchCount *3) : 0;

    let result = await this.coaches.update(
      {id: coach.id},
      {
        $set: {
          "score": coach.score,
          "touchdownDiff": coach.touchdownDiff,
          "strength": coach.strength,
          "history": coach.history
        }
      }, {upsert: false});

  }

  async _updateStrengthOfSchedule(coach){
    let strengthOfSchedule=0;

    let matches = await this.matches.find({"match.coaches.idcoach": coach.id});

    for (let index = 0; index < matches.length; index++) {
      let match = matches[index];

      const homeId = match.match.teams[0].idteamlisting;

      const homeTeam = match.teams.find(function (e) {
        return e.id === homeId
      });

      const awayId = match.match.teams[1].idteamlisting;

      const awayTeam = match.teams.find(function (e) {
        return e.id === awayId
      });

      let opponentCoach = homeTeam.idcoach == coach.id
        ? await this.coaches.findOne({"id": awayTeam.idcoach})
        : await this.coaches.findOne({"id": homeTeam.idcoach});

      strengthOfSchedule += opponentCoach.strength;
    }


    await Promise.all(matches.map(async (match) => {
    }));

    this.coaches.update(
      {id: coach.id},
      {
        $set: {
          "strengthOfSchedule": strengthOfSchedule
        }
      }, {upsert: false}
    );
  }

  async updateCoachScoringPoints(id) {

    if (!id){
      let coaches = await this.coaches.find({});

      // calculate score, td diff and coaches strength
      await Promise.all(coaches.map(this._calculateCoachStats, this));

      // calculate score, td diff and coaches strength
      await Promise.all(coaches.map(this._updateStrengthOfSchedule, this));
    } else {
      let coach = await this.coaches.findOne({id:id});
      await this._calculateCoachStats(coach);
      await this._updateStrengthOfSchedule(coach);
    }
  }

   _arrayTo2DArray (list, howMany) {
    var result = [], input = list.slice(0);
    while(list[0]) {
      result.push(list.splice(0, howMany));
    }
    return result;
  }

//

  async getCoaches(){
    let coaches = await this.coaches.find({});
    coaches = coaches.sort(function(a,b){
      if (a.score > b.score) return -1;
      if (a.score < b.score) return 1;

      if (a.touchdownDiff > b.touchdownDiff) return -1;
      if (a.touchdownDiff < b.touchdownDiff) return 1;

      if (a.strengthOfSchedule > b.strengthOfSchedule) return -1;
      if (a.strengthOfSchedule < b.strengthOfSchedule) return 1;

      if (a.history > b.history) return -1;
      if (a.history < b.history) return 1;

      if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
      if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;

      return 0
    });


    return {coaches2d: this._arrayTo2DArray(coaches, 15) };
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