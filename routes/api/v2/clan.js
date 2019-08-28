'use strict';
const express = require('express')
  , accountService = require("../../../lib/accountService.js")
  , clanService = require("../../../lib/ClanService.js")
  , util = require('../../../lib/util.js')
  , multer = require('multer')
  , inMemoryStorage = multer.memoryStorage()
  , uploadStrategy = multer({ storage: inMemoryStorage }).single('image')

  , azureStorage = require('azure-storage')
  , blobService = azureStorage.createBlobService(process.env.storage)

  , getStream = require('into-stream')
  , containerName = 'rebbl';

class ClanApi{
  constructor(){
    this.router = express.Router({mergeParams: true})
    this.getBlobName = (originalName) => `images/clanlogos/${originalName}`;

  }

  routesConfig(){
    this.router.get("/", util.ensureAuthenticated, async function(req, res){
      const account = await accountService.getAccount(req.user.name);
      const clan = await clanService.getClanByUser(account.coach); 
      const leader = await accountService.hasRole(req.user.name, "clanleader");
      res.json({ clan:clan, leader:leader && account.coach.toLowerCase() == clan.leader.toLowerCase() } );
    });

    this.router.get("/clans", util.ensureAuthenticated, async function(req, res){
      res.json(await clanService.getClans());
    });

    this.router.get("/:clan", util.ensureAuthenticated, async function(req, res){
      const clan = await clanService.getClanByName(req.params.clan); 
      res.json({ clan:clan, leader:false} );
    });



    this.router.post('/:clan/upload', util.ensureAuthenticated, util.hasRole("clanleader"), uploadStrategy, async (req, res) => {

      let clan = await clanService.getClanByName(req.params.clan);
      let account = await accountService.getAccount(req.user.name);
      if (!clan || clan.leader.toLowerCase() !== account.coach.toLowerCase()){
        res.status(403).send(`you're not the leader of this clan, ${clan.leader} is.`);
        return;
      }

      const
          blobName = this.getBlobName(`${req.params.clan}-${req.file.originalname}`)
        , stream = getStream(req.file.buffer)
        , streamLength = req.file.buffer.length;
  
      blobService.createBlockBlobFromStream(containerName, blobName, stream, streamLength, {contentSettings:{contentType:req.file.mimetype}} , err => {
        if(err) {
          res.status(500).send(err);
          return;
        }
        
        clanService.setLogo(req.params.clan, blobName);

        res.status(200).send(blobName);
      });
  });
      
    return this.router;
  }
}

module.exports = ClanApi;