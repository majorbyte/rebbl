
'use strict';
const dataService = require('../../../lib/DataService.js').rebbl
  , express = require('express')
  , util = require('../../../lib/util.js');

class Trophies{
  constructor(){
    this.router = express.Router({mergeParams: true});
  }

  routesConfig(){
    this.router.get('/:league/:season', util.cache(600), async function(req, res){
      try {
        let standings = await dataService.getStandings({
          "league":new RegExp(`^${req.params.league}$`,"i"), 
          "season":new RegExp(`^${req.params.season}$`,"i")
        });

        let coaches = [...new Set(standings.map(s => s.name))];

        let trophies = await dataService.getAccounts({coach:{$in:coaches},"trophies.display":true},{projection:{coach:1, trophies:1}});


        res.json(trophies);
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    
    });

    this.router.get('/:league/:season/donations', util.cache(600), async function(req, res){
      try {
        let standings = await dataService.getStandings({
          "league":new RegExp(`^${req.params.league}$`,"i"), 
          "season":new RegExp(`^${req.params.season}$`,"i")
        });

        let coaches = [...new Set(standings.map(s => s.name))];

        let trophies = await dataService.getAccounts({coach:{$in:coaches},"showDonation":true},{projection:{coach:1}});

        res.json(trophies.map(x => x.coach));
      }
      catch (ex){
        console.error(ex);
        res.status(500).send('Something something error');
      }
    
    });
    
    return this.router;
  }
}


module.exports = Trophies;