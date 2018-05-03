/**
 * Module dependencies.
 */
const appInsights = require("applicationinsights");
appInsights.setup(process.env["ApplicationInsights"])
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(false)
    .start();

const express = require('express')
  , path = require('path')
  , fs = require('fs');

const app = module.exports = express();

// set our default template engine to "ejs"
// which prevents the need for using file extensions
app.set('view engine', 'pug');

// set views for error and 404 pages
app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'views', "league"), path.join(__dirname, 'views', "wcq")]);


// serve static files
app.use(express.static(path.join(__dirname, 'public-images'), {maxAge: 7*24*60*60*1000, etag: false }));
app.use(express.static(path.join(__dirname, 'public')));

// parse request bodies (req.body)
app.use(express.urlencoded({ extended: true }));

app.use('/api', require('./areas/api/api'));

app.use('/maintenance', require('./areas/maintenance/maintenance'));

app.use('/wcq', require('./areas/wcq/wcq'));

app.use('/rebbl', require('./areas/rebbl/rebbl'));

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

app.listen(process.env.PORT);
console.log(`Express started on port ${process.env.PORT}`);
