const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
app.get("/index.html", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
app.get("/card.png", (req, res) => {
  res.sendFile(__dirname + "/card.png");
});
app.get("/favicon.svg", (req, res) => {
  res.sendFile(__dirname + "/favicon.svg");
});
app.get("/css/the-new-css-reset.css", function(req, res) {
  res.sendFile(__dirname + "/css/the-new-css-reset.css");
});
app.get("/css/style.css", function(req, res) {
  res.sendFile(__dirname + "/css/style.css");
});
app.get("/js/main.js", function(req, res) {
  res.sendFile(__dirname + "/js/main.js");
});
app.get("/js/calcPatterns.js", function(req, res) {
  res.sendFile(__dirname + "/js/calcPatterns.js");
});

http.listen(3000, () => {
  console.log("listening on *:3000");
});

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("joinRoom", (msg) => {
    let joinedFlag = false;

    for (let leaveRoomID of socket.rooms) {
      if (leaveRoomID === msg) {
        joinedFlag = true;
      }
      else if (leaveRoomID !== socket.id) {
        socket.leave(leaveRoomID);
      }
    }

    if (msg.length >= 4 && msg.length <= 8 && !(joinedFlag)) {
      const JOIN_ROOM_PLAYERS = io.sockets.adapter.rooms.get(msg);
      if (typeof JOIN_ROOM_PLAYERS === "undefined") {
        socket.join(msg);
        socket.roomID = msg;
        socket.host = true;
        io.to(socket.id).emit("joinRoomResult", { "success": true, "ready": false });
      }
      else if (JOIN_ROOM_PLAYERS.size === 1) {
        socket.join(msg);
        socket.roomID = msg;
        socket.host = false;
        io.to(msg).emit("joinRoomResult", { "success": true, "ready": true });
      }
      else {
        io.to(socket.id).emit("joinRoomResult", { "success": false });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnected:", socket.id);
  });

  socket.on("getHostFlag", () => {
    console.log(socket.id, socket.host);
    io.to(socket.id).emit("resHostFlag", socket.host);
  });

  socket.on("onHostFlag", () => {
    socket.host = true;
  });

  socket.on("postGameSettings", (msg) => {
    socket.broadcast.to(socket.roomID).emit("fetchGameSettings", msg);
  });

  socket.on("postViewAnswerPatternFlag", (msg) => {
    socket.broadcast.to(socket.roomID).emit("fetchViewAnswerPatternFlag", msg);
  });

  socket.on("postNum", (msg) => {
    io.to(socket.roomID).emit("fetchNum", msg);
  });
});

io.of("/").adapter.on("leave-room", (room, id) => {
  io.to(room).emit("leavePlayer", "");
});