"use strict";

const MongoClient = require('mongodb').MongoClient;

class DataService{
    constructor(){
        this.isConnected = false;
        console.log("dataservice costructed");
    }

    async init(database, cb){
        let uri = process.env["mongoDBUri"];
        this.client = await MongoClient.connect(uri, { useNewUrlParser: true });
        this.db = this.client.db(database);

        this.matches = this.db.collection("matches");
        this.players = this.db.collection("players");
        this.races = this.db.collection("races");
        this.schedules = this.db.collection("schedules");
        this.skills = this.db.collection("skills");
        this.standings = this.db.collection("standings");
        this.teams = this.db.collection("teams");

        this.casualties = this.db.collection("casualties");
        this.isConnected=true;

        console.log(`connected to ${database}`);

        if (cb) cb();
    }


/* Schedules */
    getSchedulesChain(param,projection){
        return this.schedules.find(param,projection);
    }

    async getSchedules(param,projection){
        return await this.schedules.find(param,projection).toArray();
    }
    async getSchedule(param){
        return await this.schedules.findOne(param);
    }

    insertSchedule(schedule){
        try {
            this.schedules.insertOne(schedule);
        } catch(err){
            console.error(err);
        }
    }

    updateSchedule(param,schedule,options){
        try{
            this.schedules.updateOne(param, {$set: schedule},options);
        }catch(err){
            console.error(err);
        }
    }


/* Matches */    
    async getMatches(param,projection){
        return await this.matches.find(param,projection).toArray();
    }

    async getMatch(param){
        return await this.matches.findOne(param);
    }

    insertMatch(match){
        try{
            this.matches.insertOne(match);
        } catch(err){
            console.error(err);
        }
    }

/* Standings */
    async getStandings(param){
        return await this.standings.find(param).toArray();
    }

    async updateStanding(param,standing,options){
        try{
            this.standings.updateOne(param, {$set: standing},options);
        }catch(err){
            console.error(err);
        }
    }

/* Teams */
    async getTeams(param){
        return await this.teams.find(param).toArray();
    }    

    async getTeam(param){
        return await this.teams.findOne(param);
    }    

    updateTeam(param,team,options){
        try{
            this.teams.updateOne(param, {$set: team},options);
        }catch(err){
            console.error(err);
        }
    }

/* Players */
    async getPlayers(param){
        return await this.players.find(param).toArray();
    }    

    async getPlayer(param){
        return await this.players.findOne(param);
    }   

    insertPlayer(player){
        try{
            this.players.insertOne(player);
        } catch(err){
            console.error(err);
        }
    }

    updatePlayer(param,player,options){
        try{
            this.players.updateOne(param, {$set: player},options);
        }catch(err){
            console.error(err);
        }
    }

    updatePlayers(param,player,options){
        try{
            this.players.updateMany(param, {$set: player},options);
        }catch(err){
            console.error(err);
        }
    }
/* Races */
    async getRace(param){
        return await this.races.findOne(param);
    }    
/* Skills */
    async getSkills(param){
        return await this.skills.findOne(param);
    }    

/* Casualties */    

    async getCasualties(param){
        return await this.casualties.findOne(param);
    }    

    async updateCasualties(param, cas, options){
        try{
            this.casualties.updateOne(param, cas,options);
        }catch(err){
            console.error(err);
        }
    }

}

module.exports = DataService;
module.exports.cripple = new DataService();
module.exports.rebbl =   new DataService();
;