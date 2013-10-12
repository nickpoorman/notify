/**
 * routes.js
 */

module.exports = function(app) {
  app.get("/", function(req, res) {
    res.locals.nav = 'home';
    return res.render("index");
  });

  app.use(require('../modules/auth.js'));
  app.use(require('../modules/session.js'));

  app.get("/server/status", function(req, res) {
    return res.type('txt').send('online');
  });
};