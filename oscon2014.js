var http = require('http');
var express = require('express');
var handlebars = require('express3-handlebars').create({
	defaultLayout:'main',

});
var fs = require('fs');
var Vote = require('./_models/vote.js');

var session = require('express-session'),
	RedisStore = require('connect-redis')(session);

var app = express();

app.set('host', 'nibbler3.local');
app.set('port', 15760);

if(app.get('env')=='development') app.use(require('morgan')('dev'));

var credentials = require('./credentials.js');

app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(session({ store: new RedisStore(credentials.redis['session']) }));

var mongoose = require('mongoose');
mongoose.connect(credentials.mongo.connectionString, {
	server: { socketOptions: { keepAlive: 1 } },
});

require('./_lib/auth.js')(app, credentials);

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.use(express.static(__dirname + '/public'));

app.get('/video/intro', function(req, res){
	res.redirect('https://vimeo.com/85503200');
});

app.get('/', function(req,res){
	res.render('title');
});

var VOTES_PER_USER = 3;

app.use(function(req, res, next){
	var user = req.session && req.session.passport && req.session.passport.user;
	if(!user) return next();
	Vote.find({ userId: user._id }, function(err, votes){
		if(err) return res.status(500).render('500');
		res.locals.user = { 
			id: user.id, 
			votes: votes.map(function(vote){ return vote.proposal; }),
			votesAvailable: VOTES_PER_USER,
			votesRemaining: VOTES_PER_USER - votes.length,
		};
		res.locals.user.outOfVotes = res.locals.user.votesRemaining == 0;
		res.locals.yesVote = votes.some(function(vote) { return vote.proposal === req.path.toLowerCase(); });
		next();
	});
});

app.get('/vote', function(req, res){
	var user = res.locals.user;
	if(!user) res.status(401).render('401');
	Vote.find({ userId: user._id }, function(err, votes){
		if(err) return res.status(500).render('500');
		if(votes.length<VOTES_PER_USER) {
			new Vote({ userId: user._id, proposal: req.query.proposal.toLowerCase(), date: new Date() }).save(function(err, vote){
				if(err) return res.status(500).render('500');
				res.redirect(302, req.query.proposal);
			});
		}
	});
});

app.get('/unvote', function(req, res){
	var user = res.locals.user;
	if(!user) return res.status(401).render('401');
	Vote.remove({ userId: user._id, proposal: req.query.proposal }, function(err){
		if(err) return res.status(500).render('500');
		res.redirect(302, req.query.proposal);
	});
});

app.use(function(req, res, next){
	var view = __dirname + '/views/' + req.path + '.handlebars';
	if(fs.existsSync(view)) return res.render(view);
	next();
});

app.use(function(req, res, next){
	res.status(404).render('404');
});

http.createServer(app).listen(app.get('port'), function(){
	console.log('terror started on port ' + app.get('port') + '!');
});
