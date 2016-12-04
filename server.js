var express = require('express');
var app = express();
var session = require('cookie-session');
var assert = require('assert');
/* CHANGED. -- Wong(2016)*/
var mongourl = 'mongodb://tdnodejs:a123456@ds159747.mlab.com:59747/project';
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');


app.use(function (req, res, next) {
  console.log('Time:', Date.now(), req.method, req.path);
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(session({
	name: 'session',
	keys: ['key1','key2']
}));

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.use(fileUpload());

app.set('view engine', 'ejs');

app.get('/api/read/name/:n', function(req, res) {
		MongoClient.connect(mongourl, function(err, db) {
			db.collection('resInfo').find({"name":req.params.n},{data:0}).toArray(function(err,items){
				res.json(items);
				res.end();
			});
		});
});

app.get('/api/read/borough/:b', function(req, res) {
		MongoClient.connect(mongourl, function(err, db) {
			db.collection('resInfo').find({"borough":req.params.b},{data:0}).toArray(function(err,items){
				res.json(items);
				res.end();
			});
		});
});


app.get('/api/read/cuisine/:c', function(req, res) {
		MongoClient.connect(mongourl, function(err, db) {
			db.collection('resInfo').find({"cuisine":req.params.c},{data:0}).toArray(function(err,items){
				res.json(items);
				res.end();
			});
		});
});

app.post('/api/create', function(req, res) {
	MongoClient.connect(mongourl, function(err, db) {
		request = req.body;
		db.collection('account').findOne({acc:request.acc, pwd:request.pwd}, function(err, user) {
			if(!user || (request.acc)==null || request.pwd == null) {res.send({"status": "failed"});}
			else{
			console.log(request.h1);
			uploadPhoto(db,"",request.borough,request.building,request.cuisine,request.lat,request.lon,request.name,request.street,request.uid,request.zipcode, function(result) {
				if (result.insertedId != null) {
					console.log(result.insertId);
					res.json({"status": "ok", "_id":result.insertedId});
					db.close();
				} else {
				  res.json({"status": "failed"});
				  db.close();
				}
			  });
			
			}
		});
	});
});

app.get("/login", function(req,res){
	res.render('index',{failed:""});
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
				res.render('index',{failed: "login failed"});
			}
			else{
				req.session.uid = acc;
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
			db.collection('resInfo').find(req.query,{name:1,_id:1}).toArray(function(err,items){
				console.log(req.query);
				res.render('read',{list: items, name: req.session.uid, criteria:JSON.stringify(req.query)});
			});
		});
	}
});

app.get("/", function(req,res) {
	if(!req.session.uid)
		res.render('index',{failed:""});
	else{
		res.redirect('read');
	}
});


app.get("/new", function(req,res) {
	if(!req.session.uid)
		res.redirect('/');
	else{
		res.render('new');
	}
	
});

app.get("/rate", function(req,res) {
	if(!req.session.uid)
		res.redirect('/');
	else{
	rid = req.query._id;
	MongoClient.connect(mongourl, function(err, db) {
		db.collection('resInfo').findOne({"_id":ObjectId(rid)},{name:1},function(err,items){
			res.render('rate', {"rid":rid, "name":items.name});
		});
	});
	}
});

app.post("/rateProcess", function(req,res) {
	if(!req.session.uid)
		res.redirect('/');
	else{
	uid = req.session.uid;
	score = req.body.rate;
	rid = req.query._id;
	MongoClient.connect(mongourl, function(err, db) {

			db.collection('resInfo').findOne({"_id":ObjectId(rid) , "grade":{$elemMatch:{"user":uid}}} , function(err,match){
				console.log(uid);
				if(!match){
					db.collection('resInfo').update({"_id":ObjectId(rid)},{$push:{"grade":{"user":uid,"score":score}}},function(err,object){
						if(err){
							console.error(err.message);
						}
						else{
							db.close();
							res.redirect('/display?_id='+rid+'&msg='+'1');
						}

					});
				}else{
					db.close();
					res.redirect('/display?_id='+rid+'&msg='+'0');
				}
			});

	});
	//res.render('rate');
	}
});

app.get("/display", function(req,res) {
	if(!req.session.uid)
		res.redirect('/');
	else{
	rid = req.query._id;
	msg = (req.query.msg)?req.query.msg:req.query.msg;
	if(msg == 0) msg = "<div class='w3-container w3-section w3-red w3-card-8' style='position:absolute;right: 0;'><span onclick=\"this.parentElement.style.display='none'\"  class='w3-closebtn'>&times;</span><h3>Nah</h3><p>You can only vote once.</p></div>";
	else if(msg == 1) msg = "<div class='w3-container w3-section w3-green w3-card-8' style='position:absolute;right: 0;'><span onclick=\"this.parentElement.style.display='none'\"  class='w3-closebtn'>&times;</span><h3>Voted</h3><p>Your votes has been registered successfully.</p></div>";
	else if(msg == 2) msg = "<div class='w3-container w3-section w3-red w3-card-8' style='position:absolute;right: 0;'><span onclick=\"this.parentElement.style.display='none'\"  class='w3-closebtn'>&times;</span><h3>You can't touch this</h3><p>You don't have the rights to modify.</p></div>";
	else if(msg == 3) msg = "<div class='w3-container w3-section w3-green w3-card-8' style='position:absolute;right: 0;'><span onclick=\"this.parentElement.style.display='none'\"  class='w3-closebtn'>&times;</span><h3>Modified</h3><p>The information has been modified or deleted successfully.</p></div>";
	if(!req.session.uid)
		res.redirect('/');
	else{
		MongoClient.connect(mongourl, function(err, db) {
			db.collection('resInfo').findOne({"_id":ObjectId(rid)},function(err,items){
				console.log("name  " + items.name);
				res.render('display',{list: items});
			});
		});
		}
	}
});

app.get("/account", function(req,res) {
		res.render('account',{"failed":""});
	});
	
	
/*app.get("/create", function(req,res) {
	res.render('account');
});*/

app.post("/account", function(req,res) {

	var success = 0;
	console.log("account " + req.body.name);
	console.log("account " + req.body.pw);
	MongoClient.connect(mongourl,function(err,db) {
      console.log('Connected to MongoDB\n');
      assert.equal(null,err);
     create(db,req.body.name,req.body.pw,function(result) {
		  console.log(result.insertedId);
		  console.log('working...');
          if (result.insertedId != null) {
            res.status(200);
			//res.write("Account creation sucessful");
			db.close();
			res.redirect('/');
							
          } else {
            //res.status(500);
			console.log('registration failed');
            //res.end(JSON.stringify(result));
			//res.write("Account creation failed");
			db.close();
			res.render('account',{"failed":"name has been taken."});
          }
      });
	});
});

app.post('/create', function(req, res) {
	if(!req.session.uid)
		res.redirect('/');
	else{
    var sampleFile;
	if(!req.session.uid)
	res.redirect('/');
	else{
    if (!req.files) {
        res.send('No files were uploaded.');
        return;
    }

	console.log("ok");
	console.log(req.body.name);
	
	
	
    MongoClient.connect(mongourl,function(err,db) {
      assert.equal(null,err);
	  //db.collection('account').findOne({_id:ObjectId(req.session.uid)},function(err,uName){
		  
		 uploadPhoto(db, req.files.sampleFile, req.body.borough, req.body.building, req.body.cuisine, req.body.lon, req.body.lat, req.body.name, req.body.street, req.session.uid, req.body.zipcode, function(result) {
			db.close();
			if (result.insertedId != null) {
				console.log("ok");
			  res.status(200);
			  res.redirect('/display?_id='+result.insertedId);
			  db.close();
			} else {
			  res.status(500);
			  res.write(JSON.stringify(result));
			  console.log("not ok");
			  //res.redirect('/');
			  db.close();
			}
		  });
	 // });
	  
    });
	}
	}
});


app.get('/update', function(req,res){
	if(!req.session.uid)
		res.redirect('/');
	else{
	MongoClient.connect(mongourl, function(err, db) {
		rid = req.query._id;
		db.collection('resInfo').findOne({"_id":ObjectId(rid)},function(err,item){
			//db.collection('account').findOne({_id:ObjectId(req.session.uid)},function(err,uName){
				if(item.userid == req.session.uid){
					res.render('update',{"borough":item.borough, "name":item.name, "gps":item.address.coord, "cuisine":item.cuisine, "street":item.address.street, "zipcode":item.address.zipcode, "building":item.address.building, "_id":item._id, "uid":item.uid, "rate":item.rate});
				}else{
					res.redirect('/display?_id='+rid+'&msg='+'2');
				}
			//});
		});
	});
	}
});

app.get('/delete', function(req,res){
	if(!req.session.uid)
		res.redirect('/');
	else{
		MongoClient.connect(mongourl, function(err, db) {
			rid = req.query._id;
			db.collection('resInfo').findOne({"_id":ObjectId(rid)},{"userid":1},function(err,item){
				//db.collection('account').findOne({_id:ObjectId(req.session.uid)},function(err,uName){
					if(item.userid == req.session.uid){
						db.collection('resInfo').remove({"_id":ObjectId(rid)},function(err,item){
							res.redirect('/read');
						});
					}
					else{
						res.redirect('/display?_id='+rid+'&msg='+'2');
					}
				//});
			});
		})
	}
});

app.post('/updateProcess',function(req,res){
	if(!req.session.uid)
		res.redirect('/');
	else{
	MongoClient.connect(mongourl, function(err,db) {
		gpsArray = new Array(2);
  		gps1 = (req.body.lon)?gpsArray[0] = (parseFloat(req.body.lon)):0;
  		gps2 = (req.body.lat)?gpsArray[1] = (parseFloat(req.body.lat)):0;
		
		if(req.files.sampleFile.name != ''){
			console.log("ok");
			updateSet = {
				
				"name":req.body.name,
				"cuisine":req.body.cuisine,
				"borough":req.body.borough,
				"name":req.body.name,
				"address":{
					"street":req.body.street,
					"zipcode":req.body.zipcode,
					"coord" : gpsArray,
					"building" : req.body.building
				},
				"data" : new Buffer(req.files.sampleFile.data).toString('base64'),
 				"mimetype" : req.files.sampleFile.mimetype

			};
		}else{
			console.log("not here");
			updateSet = {
				"name":req.body.name,
				"cuisine":req.body.cuisine,
				"borough":req.body.borough,
				"name":req.body.name,
				"address":{
					"street":req.body.street,
					"zipcode":req.body.zipcode,
					"coord" : gpsArray,
					"building" : req.body.building
				}
			};
		}
		//db.collection('account').findOne({_id:ObjectId(req.session.uid)},function(err,uName){
			db.collection('resInfo').update({_id:ObjectId(req.body._id)},
				{$set:updateSet},function(err,result){
					if(err){
						res.redirect('/read');
					}else{
						console.log(req.body.uid);
						res.redirect('/display?_id='+req.body._id+'&msg='+'3');
					}
			});
		//});
	});
}});

app.get('/logout', function(req, res){
  req.session = null;
  res.redirect('/');
});

function create(db,name,pw,callback) {
  db.collection('account').findOne({acc:name},function(err,nameExist){
	  if(nameExist) {
			console.log('registration failed')
			callback(nameExist);
		  }
	  else{
		  db.collection('account').insertOne({
			"acc" : name,
			"pwd" : pw,
		  }, function(err,result) {
			//assert.equal(err,null);
			if (err) {
			  result = err;
			  console.log("insertOne error: " + JSON.stringify(err));
			} else {
			  console.log("Inserted _id = " + result.insertedId);
			}
			callback(result);
		  });
	  }
  });
};




function uploadPhoto(db,bfile,borough,building,cuisine,gps1,gps2,name,street,uid,zipcode,callback) {
  console.log(bfile);
  gpsArray = new Array(2);
  gps1 = (gps1)?gpsArray[0] = (parseFloat(gps1)):gpsArray[0] = "";
  gps2 = (gps2)?gpsArray[1] = (parseFloat(gps1)):gpsArray[1] = "";
  db.collection('resInfo').insertOne({
    "data" : ((bfile)?new Buffer(bfile.data).toString('base64'):""),
    "mimetype" : bfile.mimetype,
	"borough" : borough,
	"address":
	{
		"building" : building,
		"street" : street,
		"coord" : gpsArray,
		"zipcode" : zipcode,
	},
	"cuisine" : cuisine,
	"name" : name,
	"userid" : uid,
	"zipcode" : zipcode,
  }, function(err,result) {
    //assert.equal(err,null);
    if (err) {
      console.log('insertOne Error: ' + JSON.stringify(err));
      result = err;
    } else {
      console.log("Inserted _id = " + result.insertedId);
    }
    callback(result);
  });
}




app.listen(process.env.PORT || 8099);
