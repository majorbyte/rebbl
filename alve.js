"use strict";
const  Datastore = require("./lib/async-nedb.js")
, async = require('async')
, cyanideService = require("./lib/CyanideService.js");

let matchDb = new Datastore("./highsails.db");
matchDb.loadDatabase();

async function doIt(){
    let matches = await cyanideService.teammatches({team_id:157042,limit:250,start:"2015-01-01"});

    let queue = async.queue(async function(match, cb){
        let m = await cyanideService.match({match_id:match.uuid});
        await matchDb.update({"uuid": match.uuid},m,{upsert:true});
        cb();
      }, 10  /* 10 at a time*/);
    
    queue.drain = function() {
    console.log('All Tasks finished successfully.');
    };
    
    queue.push(matches.matches);
    
}
doIt();
