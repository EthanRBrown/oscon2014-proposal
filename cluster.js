var recluster = require('recluster');

var cluster = recluster(__dirname + '/oscon2014.js', { workers: 2 });
cluster.run();

process.on('SIGUSR2', function(){
	console.log('Git SIGUSR2, reloading cluster....');
	cluster.reload();
});

console.log('spawned cluster, "kill -s SIGUSR2 ' + process.pid + '" to reload.');
