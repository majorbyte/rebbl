

/**
 * Module dependencies.
 */

var express = require('express');


var path = require('path');
var app = module.exports = express();

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

console.log('booting');
// load controllers
require('./lib/boot')(app, { verbose: !module.parent });
console.log('booted');

app.use(function(err, req, res){
  // log it
  if (!module.parent) console.error(err.stack);

  // error page
  res.status(500).render('5xx');
});

console.log('500 done');


// assume 404 since no middleware responded
app.use(function(req, res){
  res.status(404).render('404', { url: req.originalUrl });
});

console.log('404 done');

app.listen(3000);
console.log(`Express started on port ${process.env.PORT}`);
