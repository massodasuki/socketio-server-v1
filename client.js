var io = require('socket.io-client'),
socket = io.connect('https://chatserver-socketio.herokuapp.com', {
    port: 1337,
    reconnect: true
});
socket.on('connect', function () { console.log("socket connected"); });
socket.emit('send_message', { user: 'me', msg: 'whazzzup?' });