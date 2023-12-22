var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
	id: String,
	created: Date,
});

module.exports = mongoose.model('User', userSchema);
