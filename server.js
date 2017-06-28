var http = require('http');
var url = require('url');
var fs = require('fs');
var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;

var urlDB = process.env.MONGOLAB_URI;

http.createServer(function(req,res) {
  var q = url.parse(req.url, true);

  var returnStr = "";
  var query = q.query.request || "";

  fs.readFile('./static/index.html', function (err, data) {
    if (err) {return err};

    res.writeHead(200, {'Content-type': 'text/html'});
    res.write(data);

    if (query.length > 0) {
      checkIfValidURL(q.query.request)?  returnStr = putToDB(q.query.request) : returnStr = returnStr.concat("invalid site");
    }

    res.end("<br>" + returnStr);
  });
}).listen(3000);


function putToDB(entry) {
  var urlEntry = {};

  mongoClient.connect(urlDB, function(err, db) {
    if (err) {
      console.log("Error connecting to database");
      return;
    }
    else {
      console.log(3);
      getNextSequence(db,"userid", function(seqNum) {
          urlEntry = {original_URL: entry, shortened_URL:seqNum};
          db.collection('urls').insertOne(urlEntry);
          db.close();
          return JSON.stringify(urlEntry);
      });
    }


  });
}

function getNextSequence(db, name, callback) {
  db.collection('counters').findAndModify(

           { _id: name},
           {},
           { $inc: { seq: 1 } },
           {new:true}, {upsert:true},
           function(err,result) {
            console.log(result.value.seq);
            callback(result.value.seq);
           }

   );
}

function checkIfValidURL(site){

  var valid = false;
  var shortUrl = /^http[s]?:\/\/[a-zA-Z0-9]+[\.]{1}[a-zA-Z0-9]{3}$/;
  var longUrl = /^http[s]?:\/\/[www]{3}[\.]{1}[a-zA-Z0-9]+[\.]{1}[a-zA-Z0-9]{3}$/;

  if (site.search(shortUrl) !== -1 || site.search(longUrl) !== -1) {
    return true;
  }

  return false;
}

//this increments correctly
/*
 db.collection('counters').findAndModify(

           { _id: name},
           {},
           { $inc: { seq: 1 } },
           {new:true, upsert:true}
        // callback()
   );
*/