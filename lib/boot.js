/**
 * Module dependencies.
 */

var express = require('express');
var fs = require('fs');
var path = require('path');

module.exports = function(parent, options){
  var dir = path.join(__dirname, '..', 'controllers');
  var verbose = options.verbose;
  fs.readdirSync(dir).forEach(function(fname){
    var file = path.join(dir, fname)
    /*if (!fs.statSync(file).isDirectory()) return;*/
    verbose && console.log('\n   %s:', fname);
    var controller = require(file);
    var name = controller.name || fname;
    var prefix = controller.prefix || '';
    var app = express();
    var handler;
    var method;
    var url;

    // allow specifying the view engine
    if (controller.engine) app.set('view engine', controller.engine);
    app.set('views', [path.join(__dirname, '..', 'views'),  path.join(__dirname, '..', 'views', name)]);

    // generate routes based
    // on the exported methods
    for (var key in controller) {
      // "reserved" exports
      if (~['name', 'prefix', 'engine', 'before', 'cache'].indexOf(key)) continue;
      // route exports
      switch (key) {
        case 'show':
          method = 'get';
          url = '/' + name + '/:' + name + '_id';
          break;
        case 'list':
          method = 'get';
          url = '/' + name;
          break;
        case 'edit':
          method = 'get';
          url = '/' + name + '/:' + name + '_id/edit';
          break;
        case 'update':
          method = 'put';
          url = '/' + name + '/:' + name + '_id';
          break;
        case 'create':
          method = 'post';
          url = '/' + name;
          break;
        case 'index':
          method = 'get';
          url = '/';
          break;
        default:
          /* istanbul ignore next */
          throw new Error('unrecognized route: ' + name + '.' + key);
      }

      // setup
      handler = controller[key];
      url = prefix + url;


      if (!controller.cache){
        controller.cache = function(req, res, next){ next(); }
      }

      // before middleware support
      if (controller.before) {
        app[method](url, controller.cache, controller.before, handler);
        verbose && console.log('     %s %s -> before -> %s', method.toUpperCase(), url, key);
      } else {
        app[method](url, controller.cache, handler);
        verbose && console.log('     %s %s -> %s', method.toUpperCase(), url, key);
      }
    }

    // mount the app
    parent.use(app);
  });
};