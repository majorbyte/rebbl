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
        this.isConnected=true;

        console.log(`connected to ${database}`);
    }

    getURI = () => this.uri;

/* Matches */    
    getMatches = async (param,options) => await this.matches.find(param,options).toArray();

    getMatch = async param => await this.matches.findOne(param);

/* Rankings */
    getRanking = async (param,options) => await this.rankings.findOne(param,options);
    getRankings = async (param,options) => await this.rankings.find(param,options).toArray();

/* Teams */
    getTeams = async (param,options) => await this.teams.find(param,options).toArray();
    getTeam = async param => await this.teams.findOne(param);

}

module.exports = DataService;
module.exports.rebbl3 = new DataService();