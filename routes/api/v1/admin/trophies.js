'use strict';

const express = require('express')
  , trophyService = require("../../../../lib/TrophyService.js")
  , util = require('../../../../lib/util.js')
  , router = express.Router()
  , multer = require('multer');


const getBlobName = originalName => {
    return `images/trophies/${originalName}`;
};

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images/trophies");
  },
  filename: (req, file, cb) => {
    cb(null, `${file.originalname}`);
  },
});
const uploadStrategy = multer({ storage: multerStorage }).single('image');

router.post('/upload', util.ensureAuthenticated, util.hasRole("admin"), uploadStrategy, (req, res) => {

  res.status(200).send(`images/trophies/${req.file.originalname}`);
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
