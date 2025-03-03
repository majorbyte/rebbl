'use strict';

const express = require('express')
  , dataService = require("../../../../lib/DataService.js").rebbl
  , reddit = require("../../../../lib/RedditService.js")
  , scheduleTemplates = require("../../../../lib/ScheduleTemplates.js")
  , util = require('../../../../lib/util.js')
  , router = express.Router();

router.get("/", util.ensureAuthenticated, util.hasRole("admin"), async function(req,res){
  res.json(await dataService.getScheduleTemplates());
});

router.get("/:key", util.ensureAuthenticated, util.hasRole("admin"), async function(req,res){
  const template = await dataService.getScheduleTemplate({key:req.params.key});

  const result =  await scheduleTemplates.getTemplate(template, Date.now);

  res.send(result);
});


router.post("/:key", util.ensureAuthenticated, util.hasRole("admin"), async function(req,res){
  const template = await dataService.getScheduleTemplate({key:req.params.key});

  let r = await reddit.postData(template);
  await reddit.updateSidebar(template,r[0]);
  res.sendStatus(200);
});


router.put("/:key", util.ensureAuthenticated, util.hasRole("admin"), async function(req,res){

  const template = await dataService.getScheduleTemplate({key:req.params.key});
  if (!template){
    res.sendStatus(404);
    return;
  }
  
  dataService.updateScheduleTemplate({key:template.key},{
    active: req.body.active,
    round: parseInt(req.body.round),
    template: req.body.template,
    title: req.body.title
  });
  
  res.sendStatus(200);
  
});




module.exports = router;