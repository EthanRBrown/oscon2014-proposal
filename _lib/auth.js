var passport = require('passport');
var TwitterStrategy = require('passport-twitter');
var User = require('../_models/user.js');

passport.serializeUser(function(id, done){
	User.findOne({ id: id }, function(err, user){
			if(err) return done('Database error: ' + err, null);
			if(user) return done(null, id);
			user = new User({ id: id, created: new Date() });
			user.save(function(err, user){
				console.log(err, user);
				if(err) return done('Database error: ' + err, null);
				done(null, user);
			});
	});
});

passport.deserializeUser(function(id, done){
	User.find({ id: id }, function(err, user){
		if(err) return done('Database error: ' + err, null);
		if(!user) return done('Unknown user: ' + id, null);
		done(null, user);
	});
});

module.exports = function(app, credentials){

	var host = app.get('host');
	var port = (app.get('port') || 80)==80 ? '' : ':' + app.get('port');

	passport.use(new TwitterStrategy({
		consumerKey: credentials.twitter.consumerKey,
		consumerSecret: credentials.twitter.consumerSecret,
		callbackURL: 'http://' + host + port + '/auth/twitter/callback',
	}, function(token, tokenSecret, profile, done){
		done(null, '@' + profile.username);
	}));

	app.use(passport.initialize());
	app.use(passport.session());

	//app.get('/auth/twitter', passport.authenticate('twitter'));
	app.get('/auth/twitter', function(req, res, next) {
		passport.authenticate('twitter', {
			callbackURL: '/auth/twitter/callback?redirect=' + encodeURIComponent(req.query.redirect),
		})(req, res, next);
	});

	app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/auth/failed' }), function(req, res, next){
		res.redirect(302, req.query.redirect || '/');
	});

	app.use('/logout', function(req, res){
		req.logout();
		res.redirect(302, req.query.redirect || '/');
	});

	app.get('/auth/failed', function(req, res){
		res.status(401).render('401');
	});
}
