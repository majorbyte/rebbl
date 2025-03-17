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
    this.dices = this.db.collection("dices");
    this.schedules = this.db.collection("schedules");
    this.players = this.db.collection("players");
    this.retiredPlayers = this.db.collection("temporarilyRetired");

    this.zflAccounts = this.db.collection("zfl_accounts");
    this.zflBios = this.db.collection("zfl_bios");
    this.zflCompetitions = this.db.collection("zfl_competitions");
    this.zflMatches = this.db.collection("zfl_matches");
    this.zflStats = this.db.collection("zfl_stats");
    this.zflTeams = this.db.collection("zfl_teams");
    

    this.isConnected=true;


    this.skills = [];
    this.logos = [];
    this.positions = [];
    this.races = [];
    this.clanRaces = [];

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
/* Dices */    
getDice = async param => await this.dices.findOne(param);

updateDices = async (param,dices,options) => {
  try{
    dices = this.checkAtomacity(dices);
    return this.dices.updateMany(param, dices, options);
  }catch(err){
    console.error(err);
  }
}

updateDice= async (param,dice,options) => {
  try{
    dice = this.checkAtomacity(dice);
    return this.dices.updateOne(param, dice, options);
  }catch(err){
    console.error(err);
  }
}

insertDices = (dices,options) => {
  try{
    return this.dices.insertMany(dices, options);
  }catch(err){
    console.error(err);
  }
}

insertDice = (dice,options) => {
  try{
    return this.dices.insertOne(dice, options);
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
  async getRaces(){
    if (this.races.length ===0 ){
      this.races = (await this.db.collection("bb3Data").findOne({id:"races"})).data;
    }
    return this.races; 
  }
  async getSkills(){
    if (this.skills.length ===0 ){
      this.skills = (await this.db.collection("bb3Data").findOne({id:"skills"})).data;
    }
    return this.skills; 
  }
  async getSpecials(){
    if (this.specials.length ===0 ){
      this.specials = (await this.db.collection("bb3Data").findOne({id:"starplayerSkills"})).data;
    }
    return this.specials; 
  }
  async getClanRaces(){
    if (this.clanRaces.length ===0 ){
      this.clanRaces = (await this.db.collection("bb3Data").findOne({id:"clanRaces"})).data;
    }
    return this.clanRaces; 
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

  deleteSchedules = async(filter,options) => {
    try{
      return this.schedules.deleteMany(filter, options);
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
  /* players */
  getPlayer = async (param,options) => await this.players.findOne(param,options);
  getPlayers = async (param,options) => await this.players.find(param,options).toArray();

  updatePlayer = async(param,player,options) => {
    try{
      player = this.checkAtomacity(player);
      return this.players.updateOne(param, player, options);
    }catch(err){
      console.error(err);
    }
  }

  insertPlayer = (player,options) => {
    try{
      return this.players.insertOne(player, options);
    }catch(err){
      console.error(err);
    }
  }

  /* retired players */
  getRetiredPlayer = async (param,options) => await this.retiredPlayers.findOne(param,options);
  getRetiredPlayers = async (param,options) => await this.retiredPlayers.find(param,options).toArray();

  updateRetiredPlayer = async(param,player,options) => {
    try{
      player = this.checkAtomacity(player);
      return this.retiredPlayers.updateOne(param, player, options);
    }catch(err){
      console.error(err);
    }
  }

  insertRetiredPlayer = (player,options) => {
    try{
      return this.retiredPlayers.insertOne(player, options);
    }catch(err){
      console.error(err);
    }
  }

  getZFLTeam = async (param,options) => await this.zflTeams.findOne(param,options);
  getZFLTeams = async (param,options) => await this.zflTeams.find(param,options).toArray();

  updateZFLTeam = async(param,team,options) => {
    try{
      team = this.checkAtomacity(team);
      return this.zflTeams.updateOne(param, team, options);
    }catch(err){
      console.error(err);
    }
  }


  getZFLCompetition = async (param,options) => await this.zflCompetitions.findOne(param,options);
  getZFLCompetitions = async (param,options) => await this.zflCompetitions.find(param,options).toArray();

  updateZFLCompetition = async(param,competition,options) => {
    try{
      competition = this.checkAtomacity(competition);
      return this.zflCompetitions.updateOne(param, competition, options);
    }catch(err){
      console.error(err);
    }
  }

  getZFLMatch = async (param,options) => await this.zflMatches.findOne(param,options);
  getZFLMatches = async (param,options) => await this.zflMatches.find(param,options).toArray();

  updateZFLMatch = async(param,match,options) => {
    try{
      match = this.checkAtomacity(match);
      return this.zflMatches.updateOne(param, match, options);
    }catch(err){
      console.error(err);
    }
  }

  getZFLPlayerStats = async (param,options) => await this.zflStats.findOne(param,options);
  getZFLStats = async function(param,options, sort, limit){
    const cursor = this.zflStats.find(param,options);

    if (sort) cursor.sort(sort);
    if(limit) cursor.limit(limit);

    return await cursor.toArray();
  }

  updateZFLStats = async(param,stats,options) => {
    try{
      stats = this.checkAtomacity(stats);
      return this.zflStats.updateOne(param, stats, options);
    }catch(err){
      console.error(err);
    }
  }

  getAggregatedTeamStats = async (pipeline) => {
    try{
      return await this.zflStats.aggregate(pipeline).toArray();
    }catch(err){
      console.error(err);
    }

  }

  getZFLAccount = async (param,options) => await this.zflAccounts.findOne(param,options);
  getZFLAccounts = async (param,options) => await this.zflAccounts.find(param,options).toArray();

  updateZFLAccount = async(param,account,options) => {
    try{
      account = this.checkAtomacity(account);
      return this.zflAccounts.updateOne(param, account, options);
    }catch(err){
      console.error(err);
    }
  }

  insertZFLAccount = (account,options) => {
    try{
      return this.zflAccounts.insertOne(account, options);
    }catch(err){
      console.error(err);
    }
  }

  getZFLBio= async (param,options) => await this.zflBios.findOne(param,options);

  updateZFLBio = async(param,account,options) => {
    try{
      return this.zflBios.updateOne(param, account, options);
    }catch(err){
      console.error(err);
    }
  }
}

module.exports = DataService;
module.exports.rebbl3 = new DataService();