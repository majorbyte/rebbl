"use strict";
const startGlobal = process.hrtime();

const express = require('express')
  , path = require('path')
  , clanService = require('./lib/ClanService.js')
  , util = require("./lib/util.js")
  , session = require('express-session')
  , methodOverride = require('method-override')
  , bodyParser = require("body-parser")
  , MongoDBStore = require('./modules/connect-mongodb-session.js')(session)
  , RedditStrategy = require('./strategies/reddit.js')
  , DiscordStrategy = require('./strategies/discord.js').Strategy
  , dataService = require("./lib/DataService.js")
  , dataBB3Service = require("./lib/DataServiceBB3.js")
  , configurationService = require("./lib/ConfigurationService.js")
  , createScheduleService = require("./lib/createScheduleService.js")
  , profiler = require("./middleware/profiler.js").profiler;


console.log(process.hrtime(startGlobal));

const { v4: uuidv4 } = require('uuid');

class Server{
  constructor(){
    this.passport = require('passport');

    this.port = process.env.NODE_ENV === 'production' ? process.env.PORT : 3000;
    this.app = express();
    this.app.use(function(req, res, next) {
      res.setHeader('Permissions-Policy', 'interest-cohort=()');
      next();
    });
    
    this.app.locals.cyanideEnabled = true;
  }

  async appConfig(){
    await Promise.all([dataService.rebbl.init("rebbl"),dataBB3Service.rebbl3.init("rebbl3")]);
    configurationService.init();

    const uri =`mongodb://${process.env["DB_USER"]}:${process.env["DB_PASS"]}@${process.env["DB_HOST"]}:${process.env["DB_PORT"]}/${process.env["DB_NAME"]}?authSource=admin`;

    this.sessionStore = new MongoDBStore({
      uri: uri,
      databaseName: "rebbl",
      collection: 'sessions'
    });
    
    this.discordSessionStore = new MongoDBStore({
      uri: uri,
      databaseName: "rebbl",
      collection: 'discord_sessions'
    });

    this.sessionObject = {
      secret: 'keyboard cat'
      //, domain: ".localhost.com"
      , cookie: {
        domain: "localhost.com",
        maxAge:180*24*60*60*1000
      } // Let's start with half a year,
      , genid: uuidv4
      , resave: false
      , saveUninitialized: false
      , store: this.sessionStore
    };

    this.zflSessionObject = {
      secret: 'keyboard cat'
      //, domain: ".localhost.com"
      , cookie: {
        domain: "zfl.localhost.com",
        maxAge:180*24*60*60*1000
      } // Let's start with half a year,
      , genid: uuidv4
      , resave: false
      , saveUninitialized: false
      , store: this.discordSessionStore
    };

    // set our default template engine to "ejs"
    // which prevents the need for using file extensions
    this.app.set('view engine', 'pug');

    // set views for error and 404 pages
    this.app.set('views', [path.join(__dirname, 'views')/*, path.join(__dirname, 'views', "league"), path.join(__dirname, 'views')*/]);

    // Passport session setup.
    //   To support persistent login sessions, Passport needs to be able to
    //   serialize users into and deserialize users out of the session.  Typically,
    //   this will be as simple as storing the user ID when serializing, and finding
    //   the user by ID when deserializing.  However, since this example does not
    //   have a database of user records, the complete Reddit profile is
    //   serialized and deserialized.
    this.passport.serializeUser(function(user, done) {
      done(null, user);
    });

    this.passport.deserializeUser(function(obj, done) {
      done(null, obj);
    });

    // Use the RedditStrategy within Passport.
    //   Strategies in Passport require a `verify` function, which accept
    //   credentials (in this case, an accessToken, refreshToken, and Reddit
    //   profile), and invoke a callback with a user object.
    if (process.env['redditKey']) {
      this.passport.use(new RedditStrategy({
          clientID: process.env['redditKey'],
          clientSecret: process.env['redditSecret'],
          callbackURL: process.env['redditcallbackURL']
        },
        function(accessToken, refreshToken, profile, done) {
          return done(null, profile);
        }
      ));

      const strategyOptions = {
        clientID: process.env.discordClientId,
        clientSecret: process.env.discordClientSecret,
        callbackURL: process.env.zflCallbackURL,
        scope: ['identify']
      };
    
      // Define your verify function
      const verifyFunction = async (accessToken, refreshToken, profile, done) => {
        delete profile.email;
        return done(null, profile);
      }
        
      // Create a new AtsumiFlex strategy
      const discordStrategy = new DiscordStrategy(strategyOptions, verifyFunction);   
      
      this.passport.use(discordStrategy);

    }

    if (process.env.NODE_ENV === 'production'){
      this.app.set('trust proxy', 1); // trust first proxy
      this.sessionObject.cookie.secure = true; // serve secure cookies
      this.sessionObject.secret = process.env['sessionSecret'];
      this.sessionObject.cookie.domain = '.rebbl.net';

      this.zflSessionObject.cookie.secure = true; // serve secure cookies
      this.zflSessionObject.secret = process.env['sessionSecret'];
      this.zflSessionObject.cookie.domain = 'zfl.ovh';
    }

    this.app.use(bodyParser.urlencoded({ extended: true}));
    this.app.use(bodyParser.json());
    this.app.use(methodOverride());
    this.app.use(profiler);

    const zflHosts = ['zfl.ovh','zfl.localhost.com'];
    const localHosts = ["clan.localhost.com", "bb2.localhost.com", 'localhost.com'];
    const hosts = ["clan.rebbl.net","bb2.rebbl.net","rebbl.net"];

    this.app.use(this.host(zflHosts,session(this.zflSessionObject)));
    this.app.use(this.host({exclude:zflHosts}, session(this.sessionObject)));

    // Initialize Passport!  Also use passport.session() middleware, to support
    // persistent login sessions (recommended).
    this.app.use(this.passport.initialize());
    this.app.use(this.passport.session());
  }

  subdomain(subdomain, fn){

    return function(req,res,next){

      const match = req.subdomains[0] === subdomain;

      if (match) return fn(req,res,next);
      next();
    }
  }

  host = (host, fn) =>  function(req,res,next){
    //console.log(req.hostname);
    //console.log(host);
    if (Array.isArray(host) && host.some(x => req.hostname === x)) return fn(req,res,next);
    //console.log("not array");
    if (host.exclude && Array.isArray(host.exclude) && host.exclude.every(x => req.hostname !== x)) return fn(req,res,next)
    //console.log("not excluded");
    if (req.hostname === host) return fn(req,res,next);
    //console.log("not matching host");
    if (host === "*") return fn(req,res,next);
    //console.log("not wildcard");
    next();
  }

  includeRoutes(){

    //new routes(this.app).routesConfig();
    // serve static files
    this.app.use(express.static(path.join(__dirname, 'public-images'), {maxAge: 7*24*60*60*1000, etag: false }));
    this.app.use(express.static(path.join(__dirname, 'public')));

    //let's encrypt
    this.app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

    this.app.use('/robots.txt', express.static(path.join(__dirname, 'robots.txt')));


    // parse request bodies (req.body)
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use(util.checkBadBots);
    this.app.use(util.checkTeapots);

    this.app.use(util.checkAuthenticated);

    var swaggerUi = require('swagger-ui-express'),
    swaggerDocument = require('./apidoc.json');

    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


    const zflRoutes = require('./routes/zfl/zfl.js');
    this.app.use(this.host(['zfl.ovh','zfl.localhost.com'],zflRoutes.router));

    const api = require("./routes/api/v3/api.js");
    this.app.use(this.host(['api.localhost.com','api.rebbl.net'], new api().routesConfig()));

    const clan = require("./routes/clan/clan.js");
    this.app.use(this.host(["clan.localhost.com","clan.rebbl.net"], new clan().routesConfig()));

    const rebbl = require("./routes/rebbl/rebbl.js");
    this.app.use(this.host(["bb2.localhost.com","bb2.rebbl.net"], new rebbl().routesConfig()));

    const routes = require("./routes/routes.js");
    this.app.use(this.host(['localhost.com','rebbl.net'], new routes().routesConfig()));

    this.app.use(function(err, req, res,next){
      // error page
      if (err.status == 404){
        console.log(err.message);
        res.status(404).render('bb3/404', {err});
      } else {
        console.error(err.message);
        console.log(err.stack);
        res.status(500).render('bb3/500',{err});
      }
    });

  }


  maintenance(){
    this.server = require('http').Server(this.app);
    //new routes(this.app).routesConfig();
    // serve static files
    this.app.use(express.static(path.join(__dirname, 'public-images'), {maxAge: 7*24*60*60*1000, etag: false }));
    this.app.use(express.static(path.join(__dirname, 'public')));

    //let's encrypt
    this.app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

    this.app.use('/robots.txt', express.static(path.join(__dirname, 'robots.txt')));


    this.app.set('view engine', 'pug');

    // set views for error and 404 pages
    this.app.set('views', [path.join(__dirname, 'views')/*, path.join(__dirname, 'views', "league"), path.join(__dirname, 'views')*/]);


    // parse request bodies (req.body)
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use(util.checkBadBots);
    this.app.use(util.checkTeapots);

    
    this.app.get("/", (_,res) => res.render("maintenance"));


    this.server.listen(this.port);
  }  

  startSocketIOAndServer(){
    this.server = require('http').Server(this.app);
    this.io = require('socket.io')(this.server);

    this.io.on('connection', async function (socket) {
      let query = socket.handshake.query;
      if (query.roomName){
        socket.join(query.roomName);
        return;
      }
    });

    clanService.init(this.io);
    this.server.listen(this.port);
  }

  async appExecute(){
    await this.appConfig();
    this.includeRoutes();
    this.startSocketIOAndServer();
    setTimeout(() => createScheduleService.processQueue(), 10_000);
  }
}

const app = new Server();
app.appExecute();

//app.maintenance();
