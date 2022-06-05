const app = require('express')()
const http = require('http').createServer(app)
const uuid4 = require('uuid4')
const FormData = require('form-data');
const socketio = require('socket.io')(http)
const axios = require('axios').default;
var MongoClient = require('mongodb').MongoClient;
// var url = 'mongodb://localhost:27017/';
// var urlDB = 'mongodb://localhost:27017/thisDB';
var newCollection = 'chatting';

var url = 'mongodb+srv://admin:admin@cluster0.vqwjg.mongodb.net/?retryWrites=true&w=majority'
var urlDB = 'mongodb+srv://admin:admin@cluster0.vqwjg.mongodb.net/thisDB?retryWrites=true&w=majority'

MongoClient.connect(urlDB, function(err, db) {
  if (err) throw err;
  // console.log("Database created!");
  db.close();
});

MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("thisDB");
    const collection = await db.db("thisDB").listCollections({}, { nameOnly: true }).toArray()
    // console.log('List of all collections :: ', JSON.stringify(collection))
    var isExist = false;
    for (let i = 0; i < collection.length; i++) {
      if ( collection[i].name == newCollection) {
          // console.log("Collection exist!");
          isExist = true;
        }
    }

    if (isExist == false) {
        dbo.createCollection(newCollection, function(err, res) {
        if (err) throw err;
        // console.log("Collection created!");
        db.close();
      });
    }

});


app.get('/', (req, res) => {
    res.send("Node Server is running. Yay!!")
})


// socket.emit('join', {'from':19, "to":17});

//  socket.on('room', (message) {
//     print(message);
//  });
var roomName, people;
socketio.on('connect', socket => {
    socket.on('join', (room) => {

    var isRoomExist = false;
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db("thisDB");
      dbo.collection("chatting").findOne({$or:[{"people":[ room.from, room.to] },{"people":[ room.to, room.from] }]}, function(err, result) {
        if (err) throw err;
        
        if (result && result.room) {
          isRoomExist = true;
          roomName = result.room;
          people = [ room.from, room.to];
          socket.join(roomName);
        }
        else {
          var roomUuid = uuid4();
          roomName = roomUuid;
          people = [ room.from, room.to];
          socket.join(roomName);
        }


        db.close();
      });
    });
    
      const form = new FormData();
      form.append('my_id', room.from);
      form.append('to_id', room.to);
      form.append('offset', 0);

      axios({
        method  : 'post',
        url     : 'https://hafiz.work/api/mobile/open-chat',
        headers : form.getHeaders(),
        data    : form
      })
      .then((resolve) => {
        conversation = resolve.data;
        conversation.room = roomName;
        conversation.people = people;
        socketio.to(roomName).emit('room', conversation);

        if (isRoomExist == false) {
          MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var dbo = db.db("thisDB");

            conversation.room = roomName;
            conversation.people = people;
            var myobj = conversation;
            dbo.collection("chatting").insertOne(myobj, function(err, res) {
              if (err) throw err;
              // console.log("1 document inserted");
              db.close();
            });
          });
        } else {
          MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var dbo = db.db("thisDB");
            var myquery = { room: roomName };
            var newvalues = { $set: conversation };
            dbo.collection("chatting").updateOne(myquery, newvalues, function(err, res) {
              if (err) throw err;
              // console.log("1 document updated");
              db.close();
            });
          }); 
        }
      })
      .catch((error) => console.log(error));

    // callback();
    });

    // socket.emit('send_message', { 'room': room,'from' : 19, 'to' : 17, 'msg': 'testing', 'media1': 1, 'media_type': 1});
     // { 'room' : '0ebc41bf-d427-44fa-aadc-29eaa52256da', 'to' : 17, 'msg': 'testing', 'media1': 1, 'media_type': 1}
    socket.on('send_message', (newMessage, callback) => {
        var conversation;
        MongoClient.connect(url, function(err, db) {
          if (err) throw err;
          var dbo = db.db("thisDB");
          dbo.collection("chatting").findOne({"room":newMessage.room }, function(err, result) {
            if (err) throw err;
            
           
            var roomName = newMessage.room;
            if (result) {

              conversation = result;
              delete conversation._id;
              var countId = conversation.data[0].id;
              var newId = parseInt(countId) + 1;
              delete newMessage.room;
              var timestamp = + new Date();
              const newMessageTarget = Object.assign({id: newId.toString()}, newMessage, {created_at : timestamp});
              conversation.data.unshift(newMessageTarget)
              
              // console.log("conversation-- >", conversation)
              socketio.to(roomName).emit('room', conversation);

              MongoClient.connect(url, function(err, db) {
                if (err) throw err;
                var dbo = db.db("thisDB");
                var myquery = { room: roomName };
                var newvalues = { $set: conversation };
                dbo.collection("chatting").updateOne(myquery, newvalues, function(err, res) {
                  if (err) throw err;
                  // console.log("1 document updated");
                  db.close();
                });
              });


              const form = new FormData();
              form.append('from', newMessage.from);
              form.append('to', newMessage.to);
              form.append('msg', newMessage.msg);
              form.append('media1', newMessage.media1);
              form.append('media_type', newMessage.media_type);

              axios({
                method  : 'post',
                url     : 'https://hafiz.work/api/mobile/submit-chat',
                headers : form.getHeaders(),
                data    : form
              })
              .then((resolve) => {
                  console.log(resolve);
              })
              .catch((error) => console.log(error));
            }
            db.close();
          });
        });
    });
    

});

// http.listen(process.env.PORT)
http.listen(3000)


