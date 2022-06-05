const app = require('express')()
const http = require('http').createServer(app)
const uuid4 = require('uuid4')
const FormData = require('form-data');
const socketio = require('socket.io')(http)
const axios = require('axios').default;
var MongoClient = require('mongodb').MongoClient;
var urlMongo = 'mongodb://localhost:27017';
var urlDB = "mongodb://localhost:27017/seccast";


MongoClient.connect(urlMongo, function(err, db) {
  if (err) throw err;
  console.log("Database created!");
  db.close();
});

MongoClient.connect(urlMongo, async function(err, db) {
  if (err) throw err;


  if (err) throw err;

  var dbo = db.db("seccast");
  dbo.listCollections().toArray(function(err, items){
    if (err) throw err;

    console.log(items); 
    if (items.length == 0)
        console.log("No collections in database")  
  });

    const collection = await db.db("seccast").listCollections({}, { nameOnly: true }).toArray()
    console.log('List of all collections :: ', JSON.stringify(collection))

  // db.collectionNames("chatting", function(err, names) {
  //   console.log('Exists: ', names.length > 0);
  // });

  // var dbo = db.db("chatting");
  // dbo.createCollection("customers", function(err, res) {
  //   if (err) throw err;
  //   console.log("Collection created!");
  //   db.close();
  // });
});


app.get('/', (req, res) => {
    res.send("Node Server is running. Yay!!")
})
const roomList = [];
//Socket Logic

socketio.on('connect', socket => {
    socket.on('join', (room) => {
    
    MongoClient.connect(urlMongo, function(err, db) {
      if (err) throw err;
      var dbo = db.db("seccast");
      dbo.collection("chatting").findOne({}, function(err, result) {
        if (err) throw err;
        console.log(result.name);
        db.close();
      });
    });

    MongoClient.connect(urlMongo, function(err, db) {
      if (err) throw err;
      var dbo = db.db("seccast");
      var query = { address: "Park Lane 38" };
      dbo.collection("chatting").find(query).toArray(function(err, result) {
        if (err) throw err;
        console.log(result);
        db.close();
      });
    });
    
    // check existing room
    var roomIndex = null;
    for (let i = 0; i < roomList.length; i++) {
        if ( roomList[i].people.includes(room.from) && roomList[i].people.includes(room.to)) {
            roomIndex = i;
            break;
        }
    }

    var roomName;
    //user join existing room
    if (roomIndex != null) {
        roomName = roomList[roomIndex].roomId;
    } else {
        //create room
        var roomUuid = uuid4();
        var people = {'roomId':roomUuid, 'people': [room.from,room.to]}
        roomList.push(people);
        roomName = roomUuid;
    }

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
        console.log(resolve.data);
        var roomInfo = '{ "room" : "'+ roomName +'"}';
        conversation = resolve.data;
        conversation.data.unshift(roomInfo);
        socketio.to(roomName).emit('room', conversation);
      })
      .catch((error) => console.log(error.response.data));

    socket.join(roomName);
        
    // callback();
    });

    socket.on('send_message', (data, callback) => {

        // {
        //     "id": "348",
        //     "type": 1,
        //     "broadcast_id": null,
        //     "from": 19,
        //     "to": 17,
        //     "content": "testing",
        //     "media1": null,
        //     "media2": null,
        //     "media3": null,
        //     "created_at": 1654153047
        // }

        MongoClient.connect(urlMongo, function(err, db) {
          if (err) throw err;
          var dbo = db.db("seccast");
          var myobj = { name: "Company Inc", address: "Highway 37" };
          dbo.collection("chatting").insertOne(myobj, function(err, res) {
            if (err) throw err;
            console.log("1 document inserted");
            db.close();
          });
        });



        
        console.log(data.room);
      socketio.to(data.room).emit('message', data);
    });


    // socket.emit('send_message', { 'room': rooom,'from' : 19, 'to' : 17, 'msg': 'testing', 'media1': 1, 'media_type': 1});

});

// http.listen(process.env.PORT)
http.listen(3000)


