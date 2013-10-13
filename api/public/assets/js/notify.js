(function($) {

  function Notification(opts) {
    if (!(this instanceof Notification)) return new Notification(opts);
    if (!opts) opts = {};

    this.opts = {};
    if (!opts.title) return null;
    this.opts.title = opts.title;

    if (!opts.text) return null;
    this.opts.text = opts.text;

    if (opts.image) this.opts.image = opts.image;
    if (opts.sticky) this.opts.sticky = opts.sticky;
    if (opts.time) this.opts.time = opts.time;
    if (opts.class_name) this.opts.class_name = opts.class_name;

    this.opts.after_close = function() {
      // alert('Now send back to the server that we have seen the message.');
    }

    return this;
  }

  Notification.prototype.display = function() {
    if (!this.opts.title || !this.opts.text) {
      console.error("ERROR: Notification requires title and text.");
      return null;
    }
    $.gritter.add(this.opts);
  }

  var n = new Notification({title: "Hello", text: 'Welcome to Notify. You can do lots of cool notification stuff here.', image: 'http://localhost:3000/assets/images/ios7/iTunesArtwork@2x.png'});

  setTimeout(n.display.bind(n), 3000);

})(jQuery);


// {
//   // (string | mandatory) the heading of the notification
//   title: 'This is a regular notice!',
//   // (string | mandatory) the text inside the notification
//   text: 'This will fade out after a certain amount of time.',
//   // (string | optional) the image to display on the left
//   image: 'http://a0.twimg.com/profile_images/59268975/jquery_avatar_bigger.png',
//   // (bool | optional) if you want it to fade out on its own or just sit there
//   sticky: false, 
//   // (int | optional) the time you want it to be alive for before fading out (milliseconds)
//   time: 8000,
//   // (string | optional) the class name you want to apply directly to the notification for custom styling
//   class_name: 'my-class',
//         // (function | optional) function called before it opens
//   before_open: function(){
//     alert('I am a sticky called before it opens');
//   },
//   // (function | optional) function called after it opens
//   after_open: function(e){
//     alert("I am a sticky called after it opens: \nI am passed the jQuery object for the created Gritter element...\n" + e);
//   },
//   // (function | optional) function called before it closes
//   before_close: function(e, manual_close){
//                 // the manual_close param determined if they closed it by clicking the "x"
//     alert("I am a sticky called before it closes: I am passed the jQuery object for the Gritter element... \n" + e);
//   },
//   // (function | optional) function called after it closes
//   after_close: function(){
//     alert('I am a sticky called after it closes');
//   }