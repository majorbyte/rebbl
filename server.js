"use strict";
const express = require('express')
  , path = require('path')
  , chaosService = require('./lib/ChaosService.js')
  , crippleService = require('./lib/crippleService.js')
  , maintenanceService = require('./lib/MaintenanceService.js')
  , signupService = require('./lib/signupService.js')
  , util = require("./lib/util.js")
  , session = require('express-session')
  , methodOverride = require('method-override')
  , bodyParser = require("body-parser")
  , MongoDBStore = require('connect-mongodb-session')(session)
  , RedditStrategy = require('passport-reddit').Strategy
  , dataService = require("./lib/DataService.js")
  , configurationService = require("./lib/ConfigurationService.js");

class Server{
  constructor(){
    if (process.env.NODE_ENV === 'production'){
      this.appInsights = require("applicationinsights");
      this.appInsights.setup(process.env["ApplicationInsights"])
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true)
        .setUseDiskRetryCaching(false)
        .start();
    }
    this.passport = require('passport');

    this.port = process.env.NODE_ENV === 'production' ? process.env.PORT : 3000;
    this.app = express();
    this.app.locals.cyanideEnabled = true;
  }

  async appConfig(){
    await dataService.rebbl.init("rebbl");
    configurationService.init();
    await dataService.cripple.init("rebbl");

    this.sessionStore = new MongoDBStore({
      uri: process.env["mongoDBUri"],
      databaseName: "rebbl",
      collection: 'sessions'
    });


    this.sessionObject = {
      secret: 'keyboard cat'
      , cookie: {maxAge:180*24*60*60*1000} // Let's start with half a year
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
          // asynchronous verification, for effect...
          process.nextTick(function () {

            // To keep the example simple, the user's Reddit profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the Reddit account with a user record in your database,
            // and return that user instead.
            return done(null, profile);
          });
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

    const routes = require("./routes/routes.js");
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
    signupService.init(this.io);
    maintenanceService.init(this.io);
    chaosService.init(this.io);

    this.server.listen(this.port);
  }

  async appExecute(){
    await this.appConfig();
    this.includeRoutes();
    this.startSocketIOAndServer();
  }
}

const app = new Server();
app.appExecute();
