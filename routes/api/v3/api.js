"use strict";

const express = require("express")
  /* Endpoints */
  , competitionApi = require("./competition.js");

class ApiV3{
  constructor(){
    this.router =express.Router();
  }

  routesConfig(){

    this.router.use("/competition", new competitionApi().routesConfig());

    return this.router;
  }

}  

module.exports = ApiV3;