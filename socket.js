const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("./models/userModel");
const Chats = require("./models/chatModel");
const { get } = require("http");

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
  const chat_data = await Chats.findOne(
    { username: sender },
    { chats: 1, _id: 0 }
  );
  let with_users = [];
  if (chat_data) {
    with_users = [...chat_data.chats].map((user) => user[0]);
  }
  const room_ids = with_users.map((to_user) => generateRoomId(sender, to_user));

  return room_ids;
}

async function handleUnread(receiver, unread) {
  const receiverDoc = await User.findOne({ username: receiver }, { status: 1 });
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
      const data = {
        message: message.messageValue,
        sender,
        time: message.time,
      };

      const sender_chats = await Chats.findOne({ username: sender });
      sender_chats.chats.set(message.receiver, {
        messages: [
          ...sender_chats.chats.get(message.receiver).messages,
          { message: message.messageValue, type: "send", time: Date.now() },
        ],
        unread: 0,
      });
      await sender_chats.save();

      const receiver_chats = await Chats.findOne({
        username: message.receiver,
      });
      receiver_chats.chats.set(sender, {
        messages: [
          ...receiver_chats.chats.get(sender).messages,
          { message: message.messageValue, type: "receive", time: Date.now() },
        ],
        unread: await handleUnread(
          message.receiver,
          receiver_chats.chats.get(sender).unread,
          socket
        ),
      });
      await receiver_chats.save();

      socket
        .to(generateRoomId(sender, message.receiver))
        .emit("transport_message", data);
    });

    socket.on("increment_unread", async (to_update) => {
      const update_unread_of = await Chats.findOne({
        username: sender,
      });
      const unread = update_unread_of.chats.get(to_update).unread;
      update_unread_of.chats.set(to_update, {
        messages: update_unread_of.chats.get(to_update).messages,
        unread: unread + 1,
      });
      await update_unread_of.save();
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
        console.log(id);
      });
    });
  });
}

module.exports = setupSocket;
