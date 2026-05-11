const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("./models/userModel");
const Chats = require("./models/chatModel");
const Conversations = require("./models/conversationModel");
const { get } = require("http");
const { atan } = require("mathjs");

function changedPasswordAfter(user, JWTTimestamp) {
  const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000);
  if (user.passwordChangedAt) {
    return JWTTimestamp < changedTimestamp;
  }
  return false;
}

async function protect(socket, next) {
  token = "";
  if (!socket.handshake.headers.cookie) {
    const err = new Error("jwt absent");
    return next(err);
  } else {
    token = socket.handshake.headers.cookie.split("; ")[0].slice(4);
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new Error("user absent"));
  }
  if (changedPasswordAfter(currentUser, decoded.iat)) {
    return next(new Error("passwordChanged"));
  }
  socket.user = currentUser;
  next();
}

function generateRoomId(user_1, user_2) {
  return [user_1, user_2].sort().join("_");
}

async function toggleUserStatus(status, sender) {
  await User.updateOne({ username: sender }, { status });
}

async function getRoomIds(sender) {
  const convos = await Conversations.find(
    { participants: sender },
    { _id: 0, lastChat: 0, lastChatTime: 0 },
  );
  console.log(convos)
  const room_ids = convos.map((convo) => generateRoomId(convo.participants[0], convo.participants[1]));
  return room_ids;
}

async function handleUnread(receiver, unread) {
  const receiverDoc = await User.findOne({ username: receiver }, { status: 1 });
  console.log(unread)
  if (receiverDoc.status === "offline") {
    return unread + 1;
  }
  return unread;
}

function setupSocket(io) {
  io.use((socket, next) => protect(socket, next));
  io.on("connection", (socket) => {
    console.log(socket.user.username + " connected");

    const sender = socket.user.username;

    toggleUserStatus("online", sender);

    socket.on("start", async () => {
      const room_ids = await getRoomIds(sender);
      console.log(sender, room_ids)

      let data = {
        user: sender,
        status: "online",
      };
      room_ids.map((id) => {
        socket.join(id);
        console.log(socket.user.username + " joined room " + id);
        socket.to(id).emit("status_change", data);
      });
    });

    socket.on("instantAdd", (data) => {
      socket.join(generateRoomId(sender, data.receiver));
      console.log(
        sender + " joined room " + generateRoomId(sender, data.receiver)
      );
    });

    socket.on("message", async (message) => {
      await Chats.create({
        sender,
        receiver: message.receiver,
        message: message.message,
        time: message.time
      });

      const convo = await Conversations.findOne({
        participants: {
          $all: [sender, message.receiver]
        }
      })
      
      convo.unreadBy = message.receiver;
      convo.lastChat = message.message;
      convo.lastChatTime = message.time
      await convo.save()

      const data = {
        message: message.message,
        sender,
        time: message.time,
      };

      socket
        .to(generateRoomId(sender, message.receiver))
        .emit("transport_message", data);
    });

    socket.on("clear_unreads", async (data) => {
      const convo = await Conversations.findOne({
        participants: {
          $all: [sender, data.receiver]
        }
      })
      convo.unreads = 0;
      await convo.save()
    })
    
    socket.on("disconnect", async () => {
      console.log(sender + " disconnected");
      toggleUserStatus("offline", sender);
      const room_ids = await getRoomIds(sender);
      let data = {
        user: sender,
        status: "offline",
      };
      room_ids.map((id) => {
        socket.to(id).emit("status_change", data);
      });
    });
  });
}

module.exports = setupSocket;
