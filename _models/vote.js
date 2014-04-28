var mongoose = require('mongoose');

var voteSchema = new mongoose.Schema({
	userId: String,
	proposal: String,
	date: Date,
});

module.exports = mongoose.model('Vote', voteSchema);
