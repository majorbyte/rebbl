"use strict";

const MongoClient = require('mongodb').MongoClient;

class DataService{
  constructor(){
    this.isConnected = false;
    console.log("dataservice costructed");
  }

  async init(database){
    const uri =`mongodb://${process.env["DB_USER"]}:${process.env["DB_PASS"]}@${process.env["DB_HOST"]}:${process.env["DB_PORT"]}/${process.env["DB_NAME"]}3?authSource=admin`;
    this.uri = uri;

    this.client = await MongoClient.connect(this.uri, { useNewUrlParser: true ,  useUnifiedTopology: true});
    this.db = this.client.db(database);

    this.matches = this.db.collection("matches");
    this.rankings = this.db.collection("rankings");
    this.teams = this.db.collection("teams");
    this.competitions = this.db.collection("competitions");
    this.schedules = this.db.collection("schedules");
    this.isConnected=true;


    this.skills = [];
    this.logos = [];
    this.positions = [];

    console.log(`connected to ${database}`);
  }

  checkAtomacity(o) { 
    return Object.prototype.hasOwnProperty.call(o,"$set") | Object.prototype.hasOwnProperty.call(o,"$unset") ? o : {$set:o};
  }

  getURI = () => this.uri;

/* Matches */    
  getMatches = async (param,options) => await this.matches.find(param,options).toArray();
  getMatch = async param => await this.matches.findOne(param);

  updateMatches = async (param,matches,options) => {
    try{
      matches = this.checkAtomacity(matches);
      return this.matches.updateMany(param, matches, options);
    }catch(err){
      console.error(err);
    }
  }

  updateMatch = async (param,match,options) => {
    try{
      match = this.checkAtomacity(match);
      return this.matches.updateOne(param, match, options);
    }catch(err){
      console.error(err);
    }
  }

  insertMatches = (matches,options) => {
    try{
      return this.matches.insertMany(matches, options);
    }catch(err){
      console.error(err);
    }
  }

  insertMatch = (match,options) => {
    try{
      return this.matches.insertOne(match, options);
    }catch(err){
      console.error(err);
    }
  }

/* Rankings */
  getRanking = async (param,options) => await this.rankings.findOne(param,options);
  getRankings = async (param,options) => await this.rankings.find(param,options).toArray();

  updateRanking = async(param,ranking,options) => {
    try{
        ranking = this.checkAtomacity(ranking);
        return this.rankings.updateOne(param, ranking, options);
    }catch(err){
        console.error(err);
    }
  }

  insertRanking = (ranking,options) => {
    try{
      return this.rankings.insertOne(ranking, options);
    }catch(err){
      console.error(err);
    }
  }


/* Teams */
  getTeams = async (param,options) => await this.teams.find(param,options).toArray();
  getTeam = async param => await this.teams.findOne(param);

  updateTeam = async(param,team,options) => {
    try{
      team = this.checkAtomacity(team);
      return this.teams.updateOne(param, team, options);
    }catch(err){
      console.error(err);
    }
  }

  insertTeam = (team,options) => {
    try{
      return this.teams.insertOne(team, options);
    }catch(err){
      console.error(err);
    }
  }

  async getLogos(){
    if (this.logos.length ===0 ){
      this.logos = (await this.db.collection("bb3Data").findOne({id:"logos"})).data;
    }
    return this.logos; 
  }
  async getPositions(){
    if (this.positions.length ===0 ){
      this.positions = (await this.db.collection("bb3Data").findOne({id:"positions"})).data;
    }
    return this.positions; 
  }
  async getSkills(){
    if (this.skills.length ===0 ){
      this.skills = (await this.db.collection("bb3Data").findOne({id:"skills"})).data;
    }
    return this.skills; 
  }

  /* competitions */
  getCompetition = async (param,options) => await this.competitions.findOne(param,options);
  getCompetitions = async (param,options) => await this.competitions.find(param,options).toArray();

  updateCompetition = async(param,competition,options) => {
    try{
        competition = this.checkAtomacity(competition);
        return this.competitions.updateOne(param, competition, options);
    }catch(err){
        console.error(err);
    }
  }

  insertCompetition = (competition,options) => {
    try{
      return this.competitions.insertOne(competition, options);
    }catch(err){
      console.error(err);
    }
  }


  /* schedules */
  getSchedule = async (param,options) => await this.schedules.findOne(param,options);
  getSchedules = async (param,options) => await this.schedules.find(param,options).toArray();

  updateSchedule = async(param,schedule,options) => {
    try{
        schedule = this.checkAtomacity(schedule);
        return this.schedules.updateOne(param, schedule, options);
    }catch(err){
        console.error(err);
    }
  }

  insertSchedule = (schedule,options) => {
    try{
      return this.schedules.insertOne(schedule, options);
    }catch(err){
      console.error(err);
    }
  }

}

module.exports = DataService;
module.exports.rebbl3 = new DataService();