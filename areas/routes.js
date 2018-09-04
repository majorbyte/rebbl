"use strict";
const db = require("../lib/LeagueService.js")
  , ts = require("../lib/teamservice.js")
  , configuration = require("../lib/ConfigurationService.js")
  , util = require("../lib/util.js")
  , express = require("express")
  , router = express.Router();

router.use("/api", require("./api/api.js"));
router.use("/maintenance", require("./maintenance/maintenance.js"));
router.use("/wcq", require("./wcq/wcq.js"));
router.use("/rebbl", require("./rebbl/rebbl.js"));
router.use("/account", require("./account/account.js"));
router.use("/signup", require("./signup/signup.js"));
router.use("/auth", require("./account/auth.js"));
router.use("/coach", require("./coach/coach.js"));
router.use("/admin", require("./admin/admin.js"));

router.get("/", util.checkCache, async function(req, res, next){
    let data = {bigo:null,gman:null,rel:null, rounds:null, league:req.params.league };

    data.bigo = await db.getCoachScore(new RegExp(`^REBBL[\\s-]+Big O`, "i"), "Season 9",true);

    data.gman =  await db.getCoachScore(new RegExp(`^REBBL[\\s-]+GMan`, "i"), "Season 9", true);
    data.rel =  await db.getCoachScore(new RegExp(`^REBBL[\\s-]+Rel`, "i"), "Season 9", true);

    data.bigocut =  configuration.getPlayoffTickets("Big O");
    data.gmancut =  configuration.getPlayoffTickets("Gman");
    data.relcut =  configuration.getPlayoffTickets("Rel");

    data.playerData = await ts.getPlayerStats();

    data.articles = await configuration.getArticles();
    res.render("rebbl/index", data);
});

module.exports = router;