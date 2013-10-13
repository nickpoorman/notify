/*
 * api-v1.js
 */

var debug = true;
var path = require("path");
var express = require("express");
var _ = require("underscore");
var auth = require('./auth-middleware');
var request = require('request');

var sockjsURI = process.env.SOCKJS_URI ||' 127.0.0.1:9999/1/internal_notifications';

var User = require('../models/user');
var Notification = require('../models/notification');

var app = module.exports = express();
var viewPath = path.resolve(__dirname, '..', 'views');
app.set("views", viewPath);
app.set('view engine', 'jade');
app.set('view options', {
  doctype: 'html'
});

app.post('/notify', createNotification);

function createNotification(req, res, next) {
  // need the API-Key from the headers
  // need the Private-API-Key from the headers
  var api_key = req.header('API-Key');
  var private_api_key = req.header('Private-API-Key');

  if (!api_key) {
    return res.json(401, {
      message: "Missing API-Key"
    });
  }

  if (!private_api_key) {
    return res.json(401, {
      message: "Missing Private-API-Key"
    });
  }

  // lookup the API-Key, Private-API-Key in the database
  User.find({
    api_key: api_key,
    private_api_key: private_api_key

  }, function(err, users) {
    if (err) {
      return res.json(503, {
        message: "Database error"
      });
    }
    if (!users) {
      return res.json(401, {
        message: "Bad API-Key or Private-API-Key"
      });
    }

    if (typeof users.length && users.length > 1) {
      console.log("ERROR: More than one user returned in createNotification: " + api_key + ":" + private_api_key);
      return res.json(401, {
        message: "Bad API-Key or Private-API-Key"
      });
    }

    if (typeof users.length && users.length == 0) {
      console.log("ERROR: No users returned in createNotification: " + api_key + ":" + private_api_key);
      return res.json(401, {
        message: "Bad API-Key or Private-API-Key"
      });
    }

    var user = users[0];
    var nObj = {
      app_id: user.id,
      api_key: user.api_key,
      message_text: req.body['message_text'],
      message_title: req.body['message_title'],
      message_image: req.body['message_image'],
      channel_namespace: req.body['channel_namespace'],
      channel: req.body['channel'],
      message_date: req.body['message_date']
    };
    // add a new notification and at the same time fire off a request to the sockjs
    var n = new Notification(nObj);
    async.parallel([
        function(callback) {
          n.save(function(err, newNotification) {
            if (err) {
              return callback({
                status: 503,
                message: "Database error"
              });
              // return res.json(503, {
              //   message: "Database error"
              // });
            }
            // call callback on async
            callback(null, newNotification);
          });

        },

        function(callback) {
          // make a request to the sockjs server
          request.post(sockjsURI).form(nObj, function(error, response, body) {
            if (response.statusCode == 201) {
              return callback(null, {
                status: 201,
                response: response
              });
            } else {
              console.log('error: ' + response.statusCode)
              return callback({
                status: 503,
                message: "Server error",
                responseStatusCode: response.statusCode
              });
            }
          });
        }
      ],
      // results will be an array

      function(err, results) {
        if (err) {
          return res.json(err.status, {
            err.message
          })
        }
        return res.json(200, results[0].toObject());
      });
  });
}