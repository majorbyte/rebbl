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
      const clan = await clanService.getClanByUser(req.user.name); 
      const leader = await accountService.hasRole(req.user.name, "clanleader");
      res.json({ clan:clan, leader:leader } );
    });

    this.router.post("/create", util.ensureAuthenticated, util.hasRole("clanleader"), async function(req, res){
      let clan = await clanService.getClanByUser(req.user.name); 
      if (clan && clan.active) {
        res.status(500).send("You already own a clan");
        return
      }

      let name = req.body.name;
      clan = await clanService.getClanByName(name);

      if (clan && clan.active) {
        res.status(500).send("Clan already exisits");
        return;
      }

      clanService.createClan(name, req.user.name);

      res.status(200).send();

    });  

    this.router.post('/:clan/upload', util.ensureAuthenticated, util.hasRole("clanleader"), uploadStrategy, (req, res) => {
      const
          blobName = this.getBlobName(`${req.params.clan}-${req.file.originalname}`)
        , stream = getStream(req.file.buffer)
        , streamLength = req.file.buffer.length;
  
      blobService.createBlockBlobFromStream(containerName, blobName, stream, streamLength, {contentSettings:{contentType:req.file.mimetype}} , err => {
        if(err) {
          res.status(500).send(err);
        }
        
        clanService.setLogo(req.params.clan, blobName);

        res.status(200).send(blobName);
      });
  });
      
    return this.router;
  }
}

module.exports = ClanApi;