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
	keys: ['key1','key2']
}));

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

app.get("/login", function(req,res){
	res.render('index');
});

app.post("/login", function(req,res) {
	/*MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.close();
		console.log('read page required');
		res.render('read', { title: 'Hey', message: 'Hello there!' });
	})*/
	console.log('logging in......');
	MongoClient.connect(mongourl, function(err, db) {
		acc = req.body.id;
		pwd = req.body.pw;
		db.collection('account').findOne({acc:acc, pwd:pwd}, function(err, user) {
			if(err)
				throw err;
			
			if(!user){
				res.redirect('/login');
				console.log("a login attempt failed");
			}
			else{
				id = user._id;
				req.session.uid = id;
				res.redirect('/read');
			}
			
			
		});
		db.close();
	});
});

app.get("/read", function(req,res) {
	if(!req.session.uid)
		res.redirect('/');
	else{
		MongoClient.connect(mongourl, function(err, db) {
			db.collection('restaurant').find({},{name:1,_id:1}).toArray(function(err,items){
				res.render('read',{list: items});
			});
		});
	}
});

app.get("/", function(req,res) {
	if(!req.session.uid)
		res.render('index');
	else{
		res.redirect('read');
	}
});


app.get("/new", function(req,res) {
	res.render('new');
});

app.get("/rate", function(req,res) {
	rid = req.query._id;
	res.render('rate', {"rid":rid});
});

app.post("/rateProcess", function(req,res) {
	uid = req.session.uid;
	score = req.body.rate;
	rid = req.query._id;
	console.log(rid);
	MongoClient.connect(mongourl, function(err, db) {
		
		db.collection('restaurant').findOne({"_id":ObjectId(rid) , "rate":{$elemMatch:{"user":uid}}} , function(err,match){
			if(!match){
				db.collection('restaurant').update({"_id":ObjectId(rid)},{$push:{"rate":{"user":uid,"score":score}}},function(err,object){
					if(err){
						console.error(err.message);
					}
					else{
						db.close();
						res.redirect('/display?_id='+rid);
					}
					
				});
			}else{
				db.close();
				res.redirect('/display?_id='+rid);
			}
		});
	});
	//res.render('rate');
});

app.get("/display", function(req,res) {
	rid = req.query._id;
	if(!req.session.uid)
		res.redirect('/');
	else{
		MongoClient.connect(mongourl, function(err, db) {
			db.collection('restaurant').findOne({"_id":ObjectId(rid)},function(err,items){
				db.collection('account').findOne({"_id":ObjectId(items.uid)},{acc:1},function(err,creatorName){
					res.render('display',{list: items, creatorName:creatorName.acc});
				});
			});
		});
		
	}
	
	
	
});




app.listen(process.env.PORT || 8099);