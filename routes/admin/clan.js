"use strict";

const express = require("express")
  , util = require("../../lib/util.js")
  , router = express.Router();


router.get("/", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), async function(req, res){
  try{
    res.render("admin/clan/index");
  } catch(err){
    console.log(err);
  }
});



module.exports = router;