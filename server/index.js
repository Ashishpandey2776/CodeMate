const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const axios = require('axios');
const cors = require('cors');
const ACTIONS = require("./Actions");
require('dotenv').config()

const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());

const userSocketMap = {};
const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
};

io.on("connection", (socket) => {
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on('runCode', async ({ code,roomId }) => {
    try {
      const response = await axios.post('https://api.jdoodle.com/v1/execute', {
        script: code,
        language: "nodejs",
        versionIndex: "3",
        clientId: process.env.CLIENTID,
        clientSecret: process.env.CLIENTSECRET
      });
      io.to(roomId).emit("codeOutput", response.data); // Emit the data directly
    } catch (error) {
      io.to(roomId).emit("codeOutput", { error: 'Failed to execute code' }); // Emit error if any
    }
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.CHAT_MESSAGE, ({ roomId, message }) => {
    socket.to(roomId).emit(ACTIONS.CHAT_MESSAGE, { username: "You", message });
    socket.to(roomId).emit(ACTIONS.NEW_MESSAGE_NOTIFICATION, { roomId }); // Emit notification
  });


  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });

    delete userSocketMap[socket.id];
    socket.leave();
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
