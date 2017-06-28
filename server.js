var http = require('http');
var url = require('url');
var fs = require('fs');
var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;

var urlDB = process.env.MONGOLAB_URI;

http.createServer(function(req,res) {
  var q = url.parse(req.url, true);

  var returnStr = "";
  var query = q.query.request || q.pathname.slice(1); //query can be in request header or pathname

  checkURLAgainstDB(query, function(err, result) {
      if (result) { //check if shortened url request exists - if so, reroutes to matching site
          res.writeHead(302,  {Location: result.original_URL})
          res.end();
      }
      else {
         //if no matching url request, assumes input value is a website
         fs.readFile('./static/index.html', function (err, data) { //serves input page
         if (err) {return err};

         res.writeHead(200, {'Content-type': 'text/html'});
         res.write(data);

         //checks if input follows url format. if so, adds to database and assigns shortened url
         if (query.length > 0) {
            if (checkIfValidURL(q.query.request)){
                returnStr = putToDB(q.query.request, function(result) {
                res.end("<br>" + result.split(',').join("<br>")); //returns input website with shortened url for user
              })
            }
            else {
              returnStr = returnStr.concat("invalid site"); //input is an invalid website
              res.end("<br>" + returnStr);
            }
          }
      });
      }
})
}).listen(3000);

function checkURLAgainstDB(index, callback) {
  mongoClient.connect(urlDB, function(err, db) {
    if (err) {
      console.log("Error connecting to database");
      return;
    }
    else {
            db.collection('urls').findOne({shortened_URL: +index}, function(err,result) {
                if (err) {console.log('error =' + err);}
                callback(err,result);
                db.close();
            });
      }
    }
  );
}

function putToDB(entry, callback) {
  var urlEntry = {};

  mongoClient.connect(urlDB, function(err, db) {
    if (err) {
      console.log("Error connecting to database");
      return;
    }
    else {
      getNextSequence(db,"userid", function(seqNum) {
          urlEntry = {original_URL: entry, shortened_URL:seqNum};
          db.collection('urls').insertOne(urlEntry);
          db.close();
          callback(JSON.stringify(urlEntry));
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

