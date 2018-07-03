/**
 * Module dependencies.
 */
let appInsights;
if (process.env.NODE_ENV === 'production'){
  appInsights = require("applicationinsights");
  appInsights.setup(process.env["ApplicationInsights"])
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(false)
    .start();
}

const express = require('express')
  , path = require('path')
  , fs = require('fs')
  , passport = require('passport')
  , util = require('util')
  , session = require('express-session')
  , methodOverride = require('method-override')
  , bodyParser = require("body-parser")
  , NedbStore = require('nedb-session-store')(session)
  , RedditStrategy = require('passport-reddit').Strategy;

const REDDIT_CONSUMER_KEY = process.env['redditKey'];
const REDDIT_CONSUMER_SECRET = process.env['redditSecret'];

const app = module.exports = express();

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Reddit profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the RedditStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Reddit
//   profile), and invoke a callback with a user object.
passport.use(new RedditStrategy({
    clientID: REDDIT_CONSUMER_KEY,
    clientSecret: REDDIT_CONSUMER_SECRET,
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


// set our default template engine to "ejs"
// which prevents the need for using file extensions
app.set('view engine', 'pug');

// set views for error and 404 pages
app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'views', "league"), path.join(__dirname, 'views', "wcq")]);


let sessionObject = {
  secret: 'keyboard cat'
  , cookie: {maxAge:180*24*60*60*1000} // Let's start with half a year
  , resave: false
  , saveUninitialized: false
  , store: new NedbStore({ filename: 'datastore/sessions.db' })
};

if (process.env.NODE_ENV === 'production'){
  app.set('trust proxy', 1) // trust first proxy
  sessionObject.cookie.secure = true; // serve secure cookies
  sessionObject.secret =  process.env['sessionSecret'];
}

app.use(bodyParser.urlencoded({  extended: true}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(session(sessionObject));

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

// serve static files
app.use(express.static(path.join(__dirname, 'public-images'), {maxAge: 7*24*60*60*1000, etag: false }));
app.use(express.static(path.join(__dirname, 'public')));
//let's encrypt
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

app.use('/robots.txt', express.static(path.join(__dirname, 'robots.txt')));


// parse request bodies (req.body)
app.use(express.urlencoded({ extended: true }));

app.use('/api', require('./areas/api/api'));

app.use('/maintenance', require('./areas/maintenance/maintenance'));

app.use('/wcq', require('./areas/wcq/wcq'));

app.use('/rebbl', require('./areas/rebbl/rebbl'));

app.use('/account', require('./areas/account/account'));

app.use('/signup', require('./areas/signup/signup'));

app.use('/auth', require('./areas/account/auth'));

app.use('/coach', require('./areas/coach/coach'));

app.get('/', function(req, res, next){
  res.redirect('/wcq');
});

app.use(function(err, req, res, next){
  // log it
    if (!module.parent) console.error(err.stack);


  // error page
  res.status(500).render('5xx');
});

// assume 404 since no middleware responded
app.use(function(req, res,next){
  res.status(404).render('404', { url: req.originalUrl });
});

const port = process.env.NODE_ENV === 'production' ? process.env.PORT : 3000;


app.listen(port);
console.log(`Express started on port ${port}`);