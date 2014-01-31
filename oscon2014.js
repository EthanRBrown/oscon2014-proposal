var http = require('http');
var express = require('express');
var handlebars = require('express3-handlebars').create({
	defaultLayout:'main',

});
var fs = require('fs');

var app = express();

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.use(app.router);
app.use(express.static(__dirname + '/public'));

app.get('/video/intro', function(req, res){
	res.redirect('https://vimeo.com/85503200');
});

app.get('/', function(req,res){
	res.render('title');
});

app.use(function(req, res, next){
	var view = __dirname + '/views/' + req.path + '.handlebars';
	if(fs.existsSync(view)) return res.render(view);
	next();
});

app.use(function(req, res, next){
	res.render('404');
});

var port = 15760;

http.createServer(app).listen(port, function(){
	console.log('terror started on port ' + port + '!');
});
