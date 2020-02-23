'use strict';

const express = require('express')
  , trophyService = require("../../../../lib/TrophyService.js")
  , util = require('../../../../lib/util.js')
  , router = express.Router()
  , multer = require('multer')
  , inMemoryStorage = multer.memoryStorage()
  , uploadStrategy = multer({ storage: inMemoryStorage }).single('image')

  , azureStorage = require('azure-storage')
  , blobService = process.env.storage && azureStorage.createBlobService(process.env.storage)

  , getStream = require('into-stream')
  , containerName = 'rebbl';


const getBlobName = originalName => {
    return `images/trophies/${originalName}`;
};


router.post('/upload', util.ensureAuthenticated, util.hasRole("admin"), uploadStrategy, (req, res) => {

    const
          blobName = getBlobName(req.file.originalname)
        , stream = getStream(req.file.buffer)
        , streamLength = req.file.buffer.length
    ;

    blobService.createBlockBlobFromStream(containerName, blobName, stream, streamLength, {contentSettings:{contentType:req.file.mimetype}} , err => {

        if(err) {
            res.status(500).send(err);
        }

        res.status(200).send(blobName);
    });
});

router.post('/save', util.ensureAuthenticated, util.hasRole("admin"), async (req, res) => {
  const
    blobName = req.body.filename
    , name = req.body.name
    , item = {"name":name, "filename":blobName, "title":req.body.title};

  await trophyService.update(name, item);
  res.status(200).send(item);
});

router.post('/delete', util.ensureAuthenticated, util.hasRole("admin"), async (req, res) => {
  const
    filename = req.body.filename
    , name = req.body.name
    , item = {"name":name, "filename":filename};

  await trophyService.delete(item);
  res.status(200).send(item);
});


router.get("/", util.ensureAuthenticated, util.hasRole("admin"),async (req,res) => {

  const data = await trophyService.getTrophies();
  res.status(200).send({"trophies": data});
});

module.exports = router;
