/**
 * Module dependencies.
 */

const express = require('express')
  , path = require('path');

const app = module.exports = express();

// set our default template engine to "ejs"
// which prevents the need for using file extensions
app.set('view engine', 'pug');

// set views for error and 404 pages
app.set('views', path.join(__dirname, 'views'));


// serve static files
app.use(express.static(path.join(__dirname, 'public-images'), {maxAge: 7*24*60*60*1000, etag: false }));
app.use(express.static(path.join(__dirname, 'public')));

// parse request bodies (req.body)
app.use(express.urlencoded({ extended: true }));

// load controllers
require('./lib/boot')(app, { verbose: !module.parent });

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
