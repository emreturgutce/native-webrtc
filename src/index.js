const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const socket = require('socket.io');
const io = socket(server);
const { v4: uuid } = require('uuid');
const path = require('path');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.redirect(`/room/${uuid()}`);
});

app.get('/room/:roomId', (req, res) => {
  res.render('room', { roomId: req.params.roomId });
});

io.on('connection', socket => {
  socket.on('join room', roomId => {
    socket.join(roomId, () => {
      const otherUser = Object.keys(
        io.sockets.adapter.rooms[roomId].sockets
      )[0];

      if (otherUser) {
        socket.emit('other user', otherUser);
        socket.to(otherUser).emit('user joined', socket.id);
      }
    });
  });

  socket.on('offer', payload => {
    io.to(payload.target).emit('offer', payload);
  });

  socket.on('answer', payload => {
    io.to(payload.target).emit('answer', payload);
  });

  socket.on('ice-candidate', incoming => {
    io.to(incoming.target).emit('ice-candidate', incoming.candidate);
  });
});

server.listen(8000, () => console.log('server is running on port 8000'));
