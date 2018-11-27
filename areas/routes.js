"use strict";
const 
  leageuService = require("../lib/LeagueService.js")
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
  let data = {}

  let c = new RegExp(`^(^Season 10)|(^REL Rampup)|(^GMAN Rampup)`, "i");
  let l = new RegExp(`^(REBBL - )|(REL Rampup)|(GMAN Rampup)`, "i");

  await new Promise(resolve =>
    leageuService.originalFind({ "league":{"$regex":l}, "competition":{"$regex":c} }).sort({ match_uuid: -1 }).limit(20).exec(function(err,docs){
      data.rebbl = docs;
      resolve();
    })
  );

  let s  = new RegExp("(The REBBL Rabble Mixer)|(XScessively Elfly League)|(Rebbl One Minute League)|(REBBLL )","i")
  await new Promise(resolve =>
    leageuService.originalFind({ "league":{"$regex":s} }).sort({ match_uuid: -1 }).limit(20).exec(function(err,docs){
      data.sides = docs;
      resolve();
    })
  );
  res.render("rebbl/index", {data:data});
});

module.exports = router;