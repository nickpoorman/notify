var express = require('express');
var sockjs = require('sockjs');
var http = require('http');
var mongoose = require('mongoose');
var User = require('../api/models/user');

// var EventEmitter = require('events').EventEmitter;
// var e = new EventEmitter();

var redis = require("redis");

var subscriptions = {};

// 1. Echo sockjs server
var sockjs_opts = {
  sockjs_url: "http://cdn.sockjs.org/sockjs-0.3.min.js"
};

var sockjs_echo = sockjs.createServer(sockjs_opts);
sockjs_echo.on('connection', function(conn) {
  conn.isAuthed = false;
  conn.firstMessage = true;

  conn.on('data', function(message) {
    // conn.write(message);
    // Auth the user on their first message
    if (conn.firstMessage && !isAuthed) {
      conn.firstMessage = false;
      // get the first thing sent and verify it
      // parse the message
      try {
        var parsedMessage = JSON.parse(message);
      } catch {
        return conn.end();
      }
      if (typeof parsedMessage.api_key === 'undefined' || typeof parsedMessage.channel === 'undefined') {
        return conn.end();
      }
      if (typeof parsedMessage.channel_namespace === 'undefined') parsedMessage.channel_namespace = '';

      // This is the important channel name for all the messages
      var channelName = channelURI(parsedMessage.api_key, parsedMessage.channel_namespace, parsedMessage.channel);

      return User.find({
        api_key: parsedMessage.api_key,

      }, {
        lean: true
      }, function(err, users) {
        if (err) {
          return conn.end();
        }
        if (!users) {
          return conn.end();
        }

        if (typeof users.length && users.length > 1) {
          console.log("ERROR: More than one user returned in first message auth: " + api_key);
          return conn.end();
        }

        if (typeof users.length && users.length == 0) {
          console.log("ERROR: No users returned in first message auth: " + api_key);
          return conn.end();
        }

        var user = users[0];
        conn.app = user;
        conn.app.channel = parsedMessage.channel;
        // create a new subscription to redis
        var subscribe = redis.createClient(),
          publish = redis.createClient();

        subscriptions[channelName] = {
          subscribe: subscribe,
          publish: publish
        };

        conn.on('close', function() {
          delete this.subscriptions[this.channelName];
          this.subscribe.unsubscribe();
          this.subscribe.end();
          this.publish.end();
        }.bind({
          subscriptions: subscriptions,
          channelName: channelName,
          subscribe: subscribe,
          publish: publish
        }));

        subscribe.on("subscribe", function(channel, count) {
          // can now begin publishing to redis
          // publish.publish("a nice channel", "I am sending a message.");

        });

        subscribe.on("message", function(channel, message) {
          // do something when we get a message from redis
          // this is like we are getting a message to our channel
        });

        subscribe.subscribe(channelName);

        // tell the client we are now ready
        conn.write('READY');
      });
      // } else if (!conn.firstMessage && !isAuthed) {
      //   // might be waiting for auth to finish
      //   // do nothing
      //   return;
    } else if (!conn.firstMessage && isAuthed) {
      // do the parse of data here, ie. when a user clicks the message
      // need to check the database for any messages we haven't read yet
      // make this a request to the api
      // conn.app should hold the messages
      console.log("got data after auth!: " + message);
    }
  });
});

// 2. Express server
var app = express(); /* express.createServer will not work here */
app.use(express.bodyParser());
app.use(express.methodOverride());

var server = http.createServer(app);

sockjs_echo.installHandlers(server, {
  // /resource/<server_number>/<session_id>/transport
  prefix: '/n'
});

console.log(' [*] Listening on 0.0.0.0:9999');
server.listen(9999, '0.0.0.0');

app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get("/server/status", function(req, res) {
  return res.type('txt').send('online');
});

app.post('/1/internal_notifications', function(req, res) {
  // get the internal key
  var internal_private_api_key = req.header('Internal-Private-API-Key');
  if (!internal_private_api_key) {
    res.json(401, {
      message: 'Not authorized'
    })
  }
  var notificationObj = {
    app_id: req.body['message_text'],
    message_text: req.body['message_text'],
    message_title: req.body['message_title'],
    message_image: req.body['message_image'],
    channel_namespace: req.body['channel_namespace'],
    channel: req.body['channel'],
    message_date: req.body['message_date']
  };

  subscriptions

  // need to 
  return res.type('txt').send('online');
});

function channelURI(apiKey, namespace, channel){
  if(!namespace) namespace = '';
  return apiKey + ':' + namespace + ':' + channel;
}