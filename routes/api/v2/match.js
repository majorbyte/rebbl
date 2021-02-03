
'use strict';
const dataService = require('../../../lib/DataService.js').rebbl
, cors = require('cors')
, express = require('express')
, util = require('../../../lib/util.js');

class MatchApi{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }
  routesConfig(){
    
    this.router.get("/:uuid",util.cache(600), async function(req,res){
      try {

        res.json(await dataService.getMatch({uuid: req.params.uuid}));
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });
    
    var corsOptions = {
      origin: 'https://dicedornot.vengefulpickle.com',
      optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
    }

    this.router.get("/:uuid/replay", cors(corsOptions), async function(req,res){
      try {
        const match = await dataService.getMatch({uuid: req.params.uuid});
        if (match && match.filename && match.filename.indexOf("bbrz") > -1){
          res.json({filename:`https://replays.rebbl.net/${match.filename}`});
        } else {
          res.status(404).send({filename:"No replay file found"});
        }
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    });

    return this.router;
  }
}  

module.exports = MatchApi;