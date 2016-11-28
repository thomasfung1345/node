var express = require('express');
var app = express();
var session = require('cookie-session');
var assert = require('assert');
/* CHANGED. -- Wong(2016)*/
var mongourl = 'mongodb://tdnodejs:a123456@ds159747.mlab.com:59747/project'; 
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var bodyParser = require('body-parser');

app.use(session({
	name: 'session',
	keys: ['name_id']
}));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.set('view engine', 'ejs');


app.post("/read", function(req,res) {
	/*MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.close();
		console.log('read page required');
		res.render('read', { title: 'Hey', message: 'Hello there!' });
	})*/
	console.log("login with " + req.body.id);
	//db.collection('')
	res.render('read', { title: 'Hey', message: 'Hello there!' });
});

app.get("/", function(req,res) {
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.close();
		console.log('login page required');
		res.render('index', { title: 'Hey', message: 'Hello there!' });
	})
});

app.listen(process.env.PORT || 8099);