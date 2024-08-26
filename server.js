"use strict";
const express = require('express')
  , path = require('path')
  , chaosService = require('./lib/ChaosService.js')
  , crippleService = require('./lib/crippleService.js')
  , clanService = require('./lib/ClanService.js')
  , maintenanceService = require('./lib/MaintenanceService.js')
  , signupService = require('./lib/signupService.js')
  , util = require("./lib/util.js")
  , session = require('express-session')
  , methodOverride = require('method-override')
  , bodyParser = require("body-parser")
  , MongoDBStore = require('connect-mongodb-session')(session)
  , RedditStrategy = require('./strategies/reddit.js')
  , dataService = require("./lib/DataService.js")
  , dataBB3Service = require("./lib/DataServiceBB3.js")
  , configurationService = require("./lib/ConfigurationService.js")
  , createScheduleService = require("./lib/createScheduleService.js");


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
    await dataService.rebbl.init("rebbl");
    await dataBB3Service.rebbl3.init("rebbl3");
    configurationService.init();

    const uri =`mongodb://${process.env["DB_USER"]}:${process.env["DB_PASS"]}@${process.env["DB_HOST"]}:${process.env["DB_PORT"]}/${process.env["DB_NAME"]}?authSource=admin`;

    this.sessionStore = new MongoDBStore({
      uri: uri,
      databaseName: "rebbl",
      collection: 'sessions'
    });


    this.sessionObject = {
      secret: 'keyboard cat'
      , cookie: {maxAge:180*24*60*60*1000} // Let's start with half a year,
      , genid: uuidv4
      , resave: false
      , saveUninitialized: false
      , store: this.sessionStore
    };


    // set our default template engine to "ejs"
    // which prevents the need for using file extensions
    this.app.set('view engine', 'pug');

    // set views for error and 404 pages
    this.app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'views', "league"), path.join(__dirname, 'views')]);

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
    }

    if (process.env.NODE_ENV === 'production'){
      this.app.set('trust proxy', 1); // trust first proxy
      this.sessionObject.cookie.secure = true; // serve secure cookies
      this.sessionObject.secret = process.env['sessionSecret'];
    }

    this.app.use(bodyParser.urlencoded({ extended: true}));
    this.app.use(bodyParser.json());
    this.app.use(methodOverride());
    this.app.use(session(this.sessionObject));

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

    this.app.use(util.checkAuthenticated);

    var swaggerUi = require('swagger-ui-express'),
    swaggerDocument = require('./apidoc.json');

    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    const textRoutes = require('./routes/text/routes.js');
    const routes = require("./routes/routes.js");
    this.app.use(this.subdomain('text', new textRoutes().routesConfig()));
    this.app.use('/', new routes().routesConfig());

    this.app.use(function(err, res){
      // log it
        if (!module.parent) console.error(err.stack);


      // error page
      res.status(500).render('5xx');
    });

    // assume 404 since no middleware responded
    this.app.use(function(req, res){
      res.status(404).render('404', { url: req.originalUrl });
    });
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
      let data = await crippleService.getCasualties();

      socket.emit('cripple', data);

      data = await signupService.getSignUps();

      socket.emit('signup', {count:data.all.length});

      data = await maintenanceService.getCasualties();

      socket.emit('greenhorn', data);

      data = await chaosService.getCasualties();

      socket.emit('chaos', data);

    });

    crippleService.init(this.io);
    clanService.init(this.io);
    signupService.init(this.io);
    maintenanceService.init(this.io);
    chaosService.init(this.io);

    this.server.listen(this.port);
  }

  async appExecute(){
    await this.appConfig();
    this.includeRoutes();
    this.startSocketIOAndServer();
    setTimeout(() => createScheduleService.processQueue(), 10_000)
  }
}

const app = new Server();
app.appExecute();
