'use strict';

const admin = require("./admin/admin.js")
, account = require("./account/account.js")
, api = require("./api/api.js")
, auth = require("./account/auth.js")
, bloodbowl = require("./bloodbowl/bloodbowl.js")
, coach = require(`./coach/coach.js`)
, util = require("../lib/util.js");

module.exports = function registerRoutes(router){
  router.use("/account", new account().routesConfig());
  router.use("/bloodbowl", new bloodbowl().routesConfig());
  router.use("/auth", new auth().routesConfig());
  router.use("/admin", util.ensureAuthenticated, util.hasRole("admin","clanadmin"), new admin().routesConfig());
  router.use('/coach', new coach().routesConfig());
  router.use('/team', require(`./team/team.js`));
  router.use("/api", new api().routesConfig() );
}
