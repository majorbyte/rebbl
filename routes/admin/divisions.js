"use strict";

const express = require("express")
  , util = require("../../lib/util.js")
  , router = express.Router();


router.get("/", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    res.render("admin/divisions/index");
  } catch(err){
    console.log(err);
  }
});

router.get("/bb3", util.ensureAuthenticated, util.hasRole("admin"), async function(req, res){
  try{
    res.render("admin/divisions/index-bb3");
  } catch(err){
    console.log(err);
  }
});


module.exports = router;