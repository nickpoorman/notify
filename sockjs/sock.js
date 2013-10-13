var debug = true;
var _ = require('underscore');
var express = require('express');
var sockjs = require('sockjs');
var http = require('http');
// var mongoose = require('mongoose');
// var User = require('../api/models/user');
var util = require('util');

// // Database | MongoDB -----------------------------------------------------------
// var mongoose = require('mongoose');
// //var Schema = mongoose.Schema;
// var mongoDBName = "notify"
// var uri = "mongodb://localhost/" + mongoDBName;
// if ('production' === process.env.PRODUCTION) {
//   var mongoURI = "mongodb://";
//   mongoURI += (process.env.MONGO_URI || "localhost");
//   mongoURI += (process.env.MONGO_PORT || "1338");
//   mongoURI += "/" + mongoDBName;

//   uri = mongoURI;
// }
// //var conn = mongoose.createConnection(uri, {server:{poolSize:2}}); // this doesn't seem to be working
// mongoose.connect(uri);
// mongoose.connection.on("open", function() {
//   console.log(__filename + ": We have connected to mongodb");
//   console.log("doing find");
//   User.find({
//     api_key: '816bdec7cc8017f9063e3a02d1e025378d4fa5b1bbd72a85c44da7cadcb472e4'
//   }, function(err, results) {
//     console.dir(err);
//     console.dir(results);
//   });
// });
// mongoose.connection.on('error', function(err) {
//   console.error('MongoDB error: %s', err);
// });

// var User = require('../api/models/user');



var MongoClient = require('mongodb').MongoClient,
  format = require('util').format;

MongoClient.connect('mongodb://127.0.0.1:27017/notify', function(err, db) {
  if (err) throw err;

  var collection = db.collection('users');



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
    conn.isAuthed = false;
    conn.firstMessage = true;
    conn.on('data', function(message) {
      if (debug) console.log("Got data: " + message);
      // conn.write(message);
      // Auth the user on their first message
      if (conn.firstMessage && !conn.isAuthed) {
        if (debug) console.log("Doing Auth...");
        conn.firstMessage = false;
        // get the first thing sent and verify it
        // parse the message
        try {
          var parsedMessage = JSON.parse(message);
        } catch (err) {
          return conn.end();
        }
        if (debug) console.log("parsedMessage: " + util.inspect(parsedMessage));
        if (typeof parsedMessage.api_key === 'undefined' || typeof parsedMessage.channel === 'undefined') {
          if (debug) console.log("was undefined");
          return conn.end();
        }
        if (typeof parsedMessage.channel_namespace === 'undefined') parsedMessage.channel_namespace = '';

        // This is the important channel name for all the messages
        if (debug) console.log("DOING CHANNELNAME");
        var channelName = channelURI(parsedMessage.api_key, parsedMessage.channel_namespace, parsedMessage.channel);

        if (debug) console.log("Got channelName: " + channelName);
        // if (debug) console.log("User is: " + util.inspect(User));
        // Locate all the entries using find
        collection.find({
          api_key: parsedMessage.api_key
        }).toArray(function(err, users) {
          if (debug) console.log("Done with db lookup");
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

          if (debug) console.log("Got the user.");
          if (debug) console.dir(users);
          var user = users[0];
          conn.app = user;
          conn.app.channel = parsedMessage.channel;
          // create a new subscription to redis
          var subscribe = redis.createClient();
          var publish = redis.createClient();

          conn.on('close', function() {
              if (debug) console.dir("doing close");
              delete this.subscriptions[this.channelName];
              this.subscribe.unsubscribe();
              this.subscribe.end();
              this.publish.end();
            }
            // .bind({
            //   subscriptions: subscriptions,
            //   channelName: channelName,
            //   subscribe: subscribe,
            //   publish: publish
            // })
          );

          subscribe.on("subscribe", function(channel, count) {
            if (debug) console.dir("Subscribed to channel: " + channel);
            // if (debug) console.dir("this in subscribe: " + util.inspect(subscriptions));
            // can now begin publishing to redis
            // publish.publish("a nice channel", "I am sending a message.");
            subscriptions[channelName] = {
              subscribe: subscribe,
              publish: publish
            };

            // if (debug) console.dir("this in subscribe now: " + util.inspect(subscriptions));
            // console.log("REDIS: [" + channel + ']: ' + );
          });

          subscribe.on("message", function(channel, message) {
            if (debug) console.dir("got a message on subscribe client");
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
                if (debug) console.dir("doing write to client");
                conn.write(JSON.stringify(_.pick(parsedMessage, 'message_text', 'message_title', 'message_image', 'message_date')));
              }
            }
          });

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
  // app.use(express.methodOverride());
  // app.use(express.router);


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
    console.log("req: " + util.inspect(req));
    if (debug) console.log("params: " + util.inspect(req.params));
    if (debug) console.log("query: " + util.inspect(req.query));
    if (debug) console.log("body: " + util.inspect(req.body));
    // get the internal key
    var internal_private_api_key = req.header('I_Pvt_API_Key');
    if (!internal_private_api_key || internal_private_api_key !== I_PVT_API_KEY) {
      return res.json(401, {
        message: 'Not authorized'
      })
    }
    var notificationObj = {
      app_id: req.body['app_id'],
      api_key: req.body['api_key'],
      message_text: req.body['message_text'],
      message_title: req.body['message_title'],
      message_image: req.body['message_image'],
      channel_namespace: req.body['channel_namespace'],
      channel: req.body['channel'],
      message_date: req.body['message_date']
    };

    if (debug) console.dir("notificationObj: " + util.inspect(notificationObj));
    if (debug) console.log("about to call channelName");
    console.log("api_key: " + notificationObj.api_key);
    var channelName = channelURI(notificationObj.api_key, notificationObj.channel_namespace, notificationObj.channel);
    if (debug) console.log("channelName is: " + channelName);
    var subscription = subscriptions[channelName];

    if (subscription) {
      if (debug) console.log("found subscription!");
      // send out the stuff on that channel
      subscription.publish.publish(channelName, JSON.stringify(notificationObj));
      return res.json(201, {
        sent: true
      });
    }
    if (debug) console.log("didn't find subscription");
    return res.json(201, {
      sent: false
    });
  });

})

function channelURI(apiKey, namespace, channel, source) {

  if (debug) console.log("In channel name");
  if (!namespace) namespace = '';
  if (!source) source = 'apiserver';
  return source + ':' + apiKey + ':' + namespace + ':' + channel;
}