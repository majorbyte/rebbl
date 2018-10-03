'use strict';

const express = require('express')
  , accountService = require("../../../../lib/accountService.js")
  , util = require('../../../../lib/util.js')
  , router = express.Router();



  router.get('/', util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
    try{
      accountService.searchAccounts({$or: [{"bans": {$exists:true}},{"strikes": {$exists:true}}]}).then(function(data){
        data.map(x => {
            delete x._id;
            delete x.teamname;
            delete x.donations;
            delete x.showAmount;
            delete x.showDonation;
            delete x.showDonationValue;
            delete x.useDark;
            delete x.twitch;
            delete x.steam;
            delete x.discord;
            delete x.roles;
            delete x.teamn;
            delete x.race;

        });  
        res.status(200).send(data);
      });
    } catch(err){
      console.log(err);
    }
  });
  



module.exports = router;