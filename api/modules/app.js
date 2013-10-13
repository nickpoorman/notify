/*
 * apps.js
 */

var debug = true;
var path = require("path");
var express = require("express");
var _ = require("underscore");
var auth = require('./auth-middleware');

var User = require('../models/user');

var app = module.exports = express();
var viewPath = path.resolve(__dirname, '..', 'views');
app.set("views", viewPath);
app.set('view engine', 'jade');
app.set('view options', {
  doctype: 'html'
});

app.get('/apps/settings', auth.user, getSettings);

app.get('/apps/settings/edit', auth.user, editSettings);

app.put('/apps/settings', auth.user, validateUpdateSettings, updateSettings);

app.post('/apps/requestNewPrivateKey', auth.user, requestNewPrivateKey);

function getSettings(req, res, next){
  return res.render('app/settings');
}

function editSettings(req, res, next){
  if(!app) return next(err);

  res.locals.params = {};
  res.locals.params.username = app.username;
  return res.render('app/edit-settings');
}

function validateUpdateSettings(req, res, next){
  var params = ['username'];

  res.locals.params = {};
  for (var i = 0; i < params.length; i++) {
    res.locals.params[params[i]] = req.body[params[i]];
  }

  // going to do the validations here
  req.assert('username', 'Username required').notEmpty();

  var mappedErrors = req.validationErrors();
  if (mappedErrors) {
    // don't attempt to save, return the errors
    return res.render('app/settings', {
      errors: mappedErrors
    });
  }
  for (var i = 0; i < params.length; i++) {
    req.sanitize(params[i]).trim();
  }
  return next();
}

function updateSettings(req, res, next){
  if(!req.user) return next(err);

  req.user.username = req.body['username'];

  req.user.save(function(err, user){
    if(err) return next(err);

    return res.render('app/settings');
  });
}

function requestNewPrivateKey(req, res, next){
  if(!req.user) return next(err);
}