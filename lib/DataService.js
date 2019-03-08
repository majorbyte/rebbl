"use strict";

const MongoClient = require('mongodb').MongoClient;

class DataService{
    constructor(){
        this.isConnected = false;
        console.log("dataservice costructed");
    }

    async init(database, cb){
        this.uri = process.env["mongoDBUri"];
        this.client = await MongoClient.connect(this.uri, { useNewUrlParser: true });
        this.db = this.client.db(database);

        this.accounts = this.db.collection("accounts");
        this.casualties = this.db.collection("casualties");
        this.configurations = this.db.collection("configuration");
        this.matchDates = this.db.collection("matchdates");
        this.matches = this.db.collection("matches");
        this.players = this.db.collection("players");
        this.playerTypes = this.db.collection("playertypes");
        this.races = this.db.collection("races");
        this.rookies = this.db.collection("rookiesignups");
        this.schedules = this.db.collection("schedules");
        this.signups = this.db.collection("signups");
        this.skills = this.db.collection("skills");
        this.standings = this.db.collection("standings");
        this.starPlayers = this.db.collection("starplayers");
        this.teams = this.db.collection("teams");
        this.trophies = this.db.collection("trophies");
        this.unplayedGames = this.db.collection("unplayedGames");
        this.isConnected=true;

        console.log(`connected to ${database}`);
    }

    getURI(){ return this.uri;}

/* Configuration */    
    async getConfigurations(param,projection){
        return await this.configurations.find(param,projection).toArray();
    }
    async getConfiguration(param){
        return await this.configurations.findOne(param);
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
            schedule = schedule.hasOwnProperty("$set") ? schedule : {$set: schedule};

            this.schedules.updateOne(param, schedule,options);
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

/* MatchDates */    
    async getMatchDates(param,projection){
        return await this.matchDates.find(param,projection).toArray();
    }

    async getMatchDate(param){
        return await this.matchDates.findOne(param);
    }

    insertMatchDate(match){
        try{
            this.matchDates.insertOne(match);
        } catch(err){
            console.error(err);
        }
    }

    removeMatchDate(filter, options, callback){
        try{
            this.matchDates.deleteOne(filter, options, callback);
        }catch(err){
            console.error(err);
        }        
    }

    updateMatchDate(param,match,options){
        try{
            match = match.hasOwnProperty("$set") ? match : {$set: match};
            this.matchDates.updateOne(param,match,options);
        } catch(err){
            console.error(err);
        }
    }
/* Standings */
    async getStandings(param){
        return await this.standings.find(param).toArray();
    }

    updateStanding(param,standing,options){
        try{
            standing = standing.hasOwnProperty("$set") ? standing : {$set: standing};
            this.standings.updateOne(param, standing,options);
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
            team = team.hasOwnProperty("$set") ? team : {$set: team};
            this.teams.updateOne(param, team,options);
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
            player = player.hasOwnProperty("$set") ? player : {$set: player};
            this.players.updateOne(param, player,options);
        }catch(err){
            console.error(err);
        }
    }

    async updatePlayers(param,player,options){
        try{
            player = player.hasOwnProperty("$set") ? player : {$set: player};
            return this.players.updateMany(param, player,options);
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

    updateCasualties(param, cas, options){
        try{
            cas = cas.hasOwnProperty("$set") || cas.hasOwnProperty("$inc") ? cas : {$set: cas};
            this.casualties.updateOne(param, cas,options);
        }catch(err){
            console.error(err);
        }
    }

/* Unplayed games */

    async getUnplayedGames(filter){
        return await this.unplayedGames.find(filter).toArray();
    }
 
    updateUnplayedGame(param, game, options){
        try{
            game = game.hasOwnProperty("$set") ? game : {$set: game};
            this.unplayedGames.updateOne(param, game,options);
        }catch(err){
            console.error(err);
        }
    }
    
    async removeUnplayedGames(filter, options){
        try{
            return this.unplayedGames.deleteMany(filter, options);
        }catch(err){
            console.error(err);
        }
    }

/* Trophies */

    async getTrophy(filter){
        return await this.trophies.findOne(filter);
    }

    async getTrophies(filter){
        return await this.trophies.find(filter).toArray();
    }

    updateTrophy(param, game, options){
        try{
            game = game.hasOwnProperty("$set") ? game : {$set: game};
            this.gamtrophies.updateOne(param, game,options);
        }catch(err){
            console.error(err);
        }
    }

    deleteTrophy(filter, options, callback){
        try{
            this.trophies.deleteOne(filter, options, callback);
        }catch(err){
            console.error(err);
        }
    }

/* Accounts */
    async getAccount(filter){
        return await this.accounts.findOne(filter);
    }

    async getAccounts(filter){
        return await this.accounts.find(filter).toArray();
    }

    updateAccount(param,account,options){
        try{
            account = account.hasOwnProperty("$set") ? account : {$set: account};

            this.accounts.updateOne(param, account,options);
        }catch(err){
            console.error(err);
        }
    }

/* Signups */
    async getSignup(filter){
        return await this.signups.findOne(filter);
    }

    async getSignups(filter){
        return await this.signups.find(filter).toArray();
    }

    updateSignup(param, signup, options){
        try{
            signup = signup.hasOwnProperty("$set") ? signup : {$set: signup};
            this.signups.updateOne(param,signup,options);
        }catch(err){
            console.error(err);
        }
    }

    
    deleteSignup(filter, options, callback){
        let t = {};
        try{
            t = this.signups.deleteOne(filter, options, callback);
        }catch(err){
            console.error(err);
        }
    }


/* Rookie teams */

    async getRookieTeam(filter){
        return await this.rookies.findOne(filter);  
    }   

/* player types and starplayers */

    async getPlayerTypes(filter){
        return await this.playerTypes.find(filter).toArray();
    }

    async getStarPlayers(filter){
        return await this.starPlayers.find(filter).toArray();
    }

}

module.exports = DataService;
module.exports.cripple = new DataService();
module.exports.rebbl =   new DataService();
;