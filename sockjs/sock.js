var _ = require('underscore');
var express = require('express');
var sockjs = require('sockjs');
var http = require('http');
var mongoose = require('mongoose');
var User = require('../api/models/user');

var I_PVT_API_KEY = process.env.I_PVT_API_KEY || 'HD234kj23n423j4n23kjn5as8dhf8sdfh';

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

  conn.on('data', function(message) {
    conn.isAuthed = false;
    conn.firstMessage = true;
    // conn.write(message);
    // Auth the user on their first message
    if (conn.firstMessage && !conn.isAuthed) {
      conn.firstMessage = false;
      // get the first thing sent and verify it
      // parse the message
      try {
        var parsedMessage = JSON.parse(message);
      } catch (err) {
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
        var subscribe = redis.createClient();
        var publish = redis.createClient();

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
          this[channelName] = {
            subscribe: subscribe,
            publish: publish
          };
          // console.log("REDIS: [" + channel + ']: ' + );
        }.bind(subscriptions));

        subscribe.on("message", function(channel, message) {
          // do something when we get a message from redis
          // this is like we are getting a message to our channel
          // parse the json
          var parsedMessage = '';
          try {
            parsedMessage = JSON.parse(message);
          } catch (err) {
            // let's log it because this shouldn't be happening
            console.log("ERROR: Got message with not parsable JSON. CHANNEL: " + channel + ' ' + redis.print(message));
            // do nothing
            return;
          }
          if (parsedMessage) {
            // this is where we should display the notification, if it came from the server
            var cs = channel.split(':');
            if (cs[0] === 'apiserver') {
              this.write(_.pick(message, 'message_text', 'message_title', 'message_image', 'message_date'));
            }
          }
        }.bind(conn));

        subscribe.subscribe(channelName);

        // tell the client we are now ready
        conn.write('READY');
      });
      // } else if (!conn.firstMessage && !isAuthed) {
      //   // might be waiting for auth to finish
      //   // do nothing
      //   return;
    } else if (!conn.firstMessage && conn.isAuthed) {
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
  var internal_private_api_key = req.header('I_Pvt_API_Key');
  if (!internal_private_api_key || I_PVT_API_KEY !== internal_private_api_key) {
    return res.json(401, {
      message: 'Not authorized'
    })
  }
  var notificationObj = {
    app_id: req.body['message_text'],
    api_key: req.body['api_key'],
    message_text: req.body['message_text'],
    message_title: req.body['message_title'],
    message_image: req.body['message_image'],
    channel_namespace: req.body['channel_namespace'],
    channel: req.body['channel'],
    message_date: req.body['message_date']
  };

  var channelName = channelURI(notificationObj.apiKey, notificationObj.channel_namespace, notificationObj.channel);
  var subscription = subscriptions[channelName];
  if (subscription) {
    // send out the stuff on that channel
    subscription.publish.publish(channelName, JSON.stringify(notificationObj));
    return res.json(200, {
      sent: true
    });
  }

  return res.json(200, {
    sent: false
  });
});

function channelURI(apiKey, namespace, channel, source) {
  if (!namespace) namespace = '';
  if (!source) source = 'apiserver';
  return source + ':' + apiKey + ':' + namespace + ':' + channel;
}