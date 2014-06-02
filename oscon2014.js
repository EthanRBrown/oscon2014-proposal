var http = require('http');
var express = require('express');
var handlebars = require('express3-handlebars').create({
	defaultLayout:'main',
	helpers: {
		section: function(name, options){
			if(!this._sections) this._sections = {};
			this._sections[name] = options.fn(this);
			return null;
		}
	},
});
var fs = require('fs');
var Vote = require('./_models/vote.js');

var session = require('express-session'),
	RedisStore = require('connect-redis')(session);

// Array.prototype.find polyfill
if(!Array.prototype.find) Object.defineProperty(Array.prototype, 'find', {
	value: function(predicate){
		for(var i=0; i<this.length; i++) if(predicate(this[i])) return this[i];
	},
	enumerable: false,
});

var app = express();

app.set('port', 15760);

if(app.get('env')=='development') app.use(require('morgan')('dev'));

var credentials = require('./credentials.js');
var raven = new (require('raven').Client)(credentials.sentry.dsn);

app.use(require('cookie-parser')(credentials.cookieSecret));
if(app.get('env')==='development'){
	app.use(session());
} else {
	app.use(session({ store: new RedisStore(credentials.redis.session) }));
}

var mongoose = require('mongoose');
mongoose.connect(credentials.mongo.connectionString, {
	server: { socketOptions: { keepAlive: 1 } },
});

// keep database connection alive
setInterval(function(){
	// arbitrary database access
	Vote.count(function(err, count){
		if(err) return raven.captureError(err, { extra: { component: 'database keep-alive' } });
	});
}, 1000 * 60);

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
	var user = req.user;
	if(!user) return next();
	Vote.find({ userId: user._id }, function(err, votes){
		if(err) return res.status(500).render('500');
		res.locals.user = { 
			id: user.id, 
			_id: user._id,
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

var proposals = {
	'/page4': 'BE THE COMPOSER',
	'/page5': 'DARE YOU ACCEPT THE CHALLENGE',
	'/page7': 'YOU CHOOSE THE ADVENTURE',
	'/page8': 'GOING VIRAL',
	'/page9': 'POSTMODERN POINTILLISM',
	'/page11': 'WHERE WILL YOU BE?',
	'/page12': 'DEGREES OF SEPARATION',
	'/page13': 'YOU ARE THE HEAT MAP',
	'/page28': 'OSCONOPHONE',
	'/page29': 'DIGITAL DANCING',
}

app.get('/results', function(req, res){
	// prevent this page from being indexed
	res.locals.noRobots = true;
	// user not logged in -- show login dialog
	if(!req.user) return res.render('results');
	// user not authorized -- redirect to 403
	if(credentials.authorization.viewResults.indexOf(req.user.id)<0) return res.status(403).render('403');
	// display results
	Vote.find(function(err, votes){
		context = {
			votes : votes.reduce(function(c, v){
				var x = c.find(function(y){ return y.path===v.proposal; });
				if(!x) x = { 
					path: v.proposal, 
					name: proposals[v.proposal],
					count: 0 
				}, c.push(x);
				x.count++;
				return c;
			}, []),
		};
		context.votes.sort(function(a, b) { return b.count - a.count; });
		Object.defineProperty(context.votes, 'total', {
			value: context.votes.reduce(function(c, v) { return c += v.count; }, 0),
			enumerable: false,
		});
		return res.render('results', context);
	});
});

app.get('/status', function(req, res){
	Vote.find(function(err, votes){
		if(err) return res.status(500).json({ status: 'error', message: 'database error', stack: err.stack });
		return res.json({ 
			status: 'okay',
			votes: votes.length,
		});
	});
});

var autoViews = {};

app.use(function(req, res, next){
	var view = autoViews[req.path];
	if(!view){
		view = __dirname + '/views/' + req.path + '.handlebars';
		if(!fs.existsSync(view)) return next();
		autoViews[req.path] = view;
	}
	res.render(view);
});

app.use(function(req, res, next){
	res.status(404).render('404');
});

app.use(function(err, req, res, next){
	raven.captureError(err, { extra: { 
		host: req.host,
		url: req.originalUrl,
		userId: req.user ? req.user.id : null } });
	res.status(500).render('500');
});

http.createServer(app).listen(app.get('port'), function(){
	console.log('terror started on port ' + app.get('port') + '!');
});
