
'use strict';
const dataService = require('../../../lib/DataService.js').rebbl
, express = require('express')
, util = require('../../../lib/util.js');

class MatchApi{
  constructor(){
    this.router = express.Router({mergeParams: true})
  }
  routesConfig(){
    
    this.router.get("/:uuid",util.cache(600), async function(req,res){
      try {

        res.status(200).send(await dataService.getMatch({uuid: req.params.uuid}));
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