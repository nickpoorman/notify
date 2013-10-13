var request = require('request');
var util = require('util');

var uri = 'http://localhost:3000/notify';

var api_key = '816bdec7cc8017f9063e3a02d1e025378d4fa5b1bbd72a85c44da7cadcb472e4';
var channel = '525a99127f37a00000000001';
var private_api_key = '07fc6dbf47349f00d95a616824dcc112a83d96789c1e920b0cc01f285d8c8d63';

var formData = {
  message_text: 'A test message to our people.',
  message_title: 'A Simple Title',
  message_image: 'http://localhost:3000/assets/images/ios7/iTunesArtwork@2x.png',
  channel_namespace: '',
  channel: '525a99127f37a00000000001',
  message_date: Date.now()
};

var options = {
  headers: {
    'API-Key': api_key,
    'Private-API-Key': private_api_key
  }
};

request.post(uri, options, function(error, response, body) {
  // console.log("Error: " + util.inspect(error));
  // console.log("Response: " + util.inspect(response));
  console.log("Body: " + body);
}).form(formData);