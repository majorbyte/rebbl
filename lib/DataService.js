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
        this.seasons = this.db.collection("seasons");
        this.signups = this.db.collection("signups");
        this.skilldDescriptions = this.db.collection("skilldescriptions");
        this.skills = this.db.collection("skills");
        this.standings = this.db.collection("standings");
        this.starPlayers = this.db.collection("starplayers");
        this.teams = this.db.collection("teams");
        this.trophies = this.db.collection("trophies");
        this.unplayedGames = this.db.collection("unplayedGames");
        this.announcements = this.db.collection("announcements");
        this.moderationLog = this.db.collection("moderationlog");
        this.clans = this.db.collection("clans");
        this.isConnected=true;

        console.log(`connected to ${database}`);
    }

    getURI(){ return this.uri;}



/* Configuration */    
    async getConfigurations(param,options){
        return await this.configurations.find(param,options).toArray();
    }
    async getConfiguration(param){
        return await this.configurations.findOne(param);
    }
    async getSeasons(){
        return await this.seasons.find({},{}).toArray();
    }
    async getSeason(param){
        return await this.seasons.findOne(param);
    }

/* Schedules */
    getSchedulesChain(param,options){
        return this.schedules.find(param,options);
    }

    async getSchedules(param,options){
        return await this.schedules.find(param,options).toArray();
    }
    async getSchedule(param){
        return await this.schedules.findOne(param);
    }

    insertSchedule(schedule){
        /*
        Teamname can be a number
        */

        if (typeof(schedule.opponents[0].team.name) === "number"){
            schedule.opponents[0].team.name += "";
        }
        if (typeof(schedule.opponents[1].team.name) === "number"){
            schedule.opponents[1].team.name += "";
        }

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
    async updateScheduleAsync (param,schedule,options){
        try{
            schedule = schedule.hasOwnProperty("$set") ? schedule : {$set: schedule};

            await this.schedules.updateOne(param, schedule,options);
        }catch(err){
            console.error(err);
        }
    }


/* Matches */    
    async getMatches(param,options){
        return await this.matches.find(param,options).toArray();
    }

    async getMatch(param){
        return await this.matches.findOne(param);
    }

    updateMatch(param,match,options){
        try{
            match = match.hasOwnProperty("$set") ? match : {$set: match};
            this.matches.updateOne(param,match,options);
        } catch(err){
            console.error(err);
        }
    }    

    insertMatch(match){
        /*
        Teamname can be a number
        */

        if (typeof(match.teams[0].name) === "number"){
            match.teams[0].name += "";
            match.match.teams[0].teamname += "";
        }
        if (typeof(match.teams[1].name) === "number"){
            match.teams[1].name += "";
            match.match.teams[1].teamname += "";
        }
        const key = {uuid:match.uuid};

        try{
            this.matches.updateOne(key, match,{upsert:true});
        } catch(err){
            console.error(err);
        }
    }

/* MatchDates */    
    async getMatchDates(param,options){
        return await this.matchDates.find(param,options).toArray();
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
    async getStandings(param,options){
        return await this.standings.find(param,options).toArray();
    }

    updateStanding(param,standing,options){
        try{
            standing = standing.hasOwnProperty("$set") ? standing : {$set: standing};
            this.standings.updateOne(param, standing,options);
        }catch(err){
            console.error(err);
        }
    }

    async updateStandings(param,standings,options){
        try{
            standings = standings.hasOwnProperty("$set") ? standings : {$set: standings};
            return this.standings.updateMany(param, standings,options);
        }catch(err){
            console.error(err);
        }
    }

    async removeStandings(filter, options){
        try{
            return this.standings.deleteMany(filter, options);
        }catch(err){
            console.error(err);
        }
    }

    insertStandings(standings,options){
        try{
            return this.standings.insertMany(standings, options);
        }catch(err){
            console.error(err);
        }
    }

/* Teams */
    async getTeams(param,options){
        return await this.teams.find(param,options).toArray();
    }    

    async getTeam(param){
        return await this.teams.findOne(param);
    }    

    updateTeam(param,team,options){
        try{
            team = team.hasOwnProperty("$set") ? team : {$set: team};

            if(team.$set.hasOwnProperty("team") && team.$set.team.hasOwnProperty("name"))
                team.$set.team.name += "";

            this.teams.updateOne(param, team,options);
        }catch(err){
            console.error(err);
        }
    }

/* Players */
    async getPlayers(param,options){
        return await this.players.find(param,options).toArray();
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

    async getRaces(param,options){
        return await this.races.find(param,options).toArray();
    }    

/* Skills */
    async getSkills(param){
        return await this.skills.findOne(param);
    }    

    async getSkillDescriptions(param,options){
        return await this.skilldDescriptions.find(param,options).toArray();
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

    async getUnplayedGames(param,options){
        return await this.unplayedGames.find(param,options).toArray();
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

    async getTrophies(param,options){
        return await this.trophies.find(param,options).toArray();
    }

    updateTrophy(param, trophy, options){
        try{
            trophy = trophy.hasOwnProperty("$set") ? trophy : {$set: trophy};
            this.trophies.updateOne(param, trophy,options);
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
    async getAccounts(filter,options){
        return await this.accounts.find(filter,options).toArray();
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
    async getSignup(param){
        if (!param.season){
            param.season = "season 12";
        } 
        return await this.signups.findOne(param);
    }

    async getSignups(param,options){
        if (!param.season){
            param.season = "season 12";
        }
        return await this.signups.find(param,options).toArray();
    }

    updateSignup(param, signup, options){
        if (!param.season){
            param.season = "season 12";
        }
        try{
            signup = signup.hasOwnProperty("$set") ? signup : {$set: signup};
            this.signups.updateOne(param,signup,options);
        }catch(err){
            console.error(err);
        }
    }

    
    deleteSignup(param, options, callback){
        if (!param.season){
            param.season = "season 12";
        }
        try{
            this.signups.deleteOne(param, options, callback);
        }catch(err){
            console.error(err);
        }
    }


/* Rookie teams */

    async getRookieTeam(filter){
        return await this.rookies.findOne(filter);  
    }   

/* player types and starplayers */

    async getPlayerTypes(filter,options){
        return await this.playerTypes.find(filter,options).toArray();
    }

    async getStarPlayers(filter,options){
        return await this.starPlayers.find(filter,options).toArray();
    }

/* Accouncements */
    insertAnnouncement(param, announcement, options){
        try{
            this.announcements.insertOne(param,announcement,options);
        }catch(err){
            console.error(err);
        }
    }

    async getAnnouncements(param,options){
        return await this.announcements.find(param,options).toArray();
    }

    deleteAnnouncements(param, options, callback){
        try{
            this.announcements.deleteMany(param, options, callback);
        }catch(err){
            console.error(err);
        }
    }
/* Configuration */    
    async getModerationLogs(param,options){
        return await this.moderationLog.find(param,options).toArray();
    }
    insertModerationEntry(param, entry, options){
        try{
            this.moderationLog.insertOne(param,entry,options);
        }catch(err){
            console.error(err);
        }
    }

/* Clans */
    async getClan(param){
        return await this.clans.findOne(param);
    }

    async getClans(param,options){
        return await this.clans.find(param,options).toArray();
    }

    updateClan(param, clan, options){
        try{
            clan = clan.hasOwnProperty("$set") ? clan : {$set: clan};
            this.clans.updateOne(param,clan,options);
        }catch(err){
            console.error(err);
        }
    }
    insertClan(clan){
        try{
            this.clans.insertOne(clan);
        } catch(err){
            console.error(err);
        }
    }

}

module.exports = DataService;
module.exports.cripple = new DataService();
module.exports.rebbl =   new DataService();