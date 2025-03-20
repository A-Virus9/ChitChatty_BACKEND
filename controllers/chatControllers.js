const catchAsync = require("../utils/catchAsync");
const User = require("../models/userModel");
const Chats = require("../models/chatModel");

exports.addChat = catchAsync(async (req, res) => {
  const sender_name = req.user.username;
  const receiver_name = req.body.newUser;
  console.log(req.headers);

  const sender_chats = await Chats.findOne(
    { username: sender_name },
    { chats: 1 }
  );
  if (![...sender_chats.chats].map((user) => user[0]).includes(receiver_name)) {
    const username = await User.findOne({ username: receiver_name });
    if (username) {
      sender_chats.chats.set(receiver_name, []);
      await sender_chats.save();

      const receiver_chats = await Chats.findOne(
        { username: receiver_name },
        { chats: 1 }
      );
      receiver_chats.chats.set(sender_name, []);
      await receiver_chats.save();

      res.status(200).json({
        status: "added",
      });
    } else {
      res.status(404).json({
        status: "user absent",
      });
    }
  } else if (
    [...sender_chats.chats].map((user) => user[0]).includes(receiver_name)
  ) {
    res.status(200).json({
      status: "already present",
    });
  } else {
    res.status(200).json({
      status: "failure",
    });
  }
});

exports.getChats = catchAsync(async (req, res) => {
  const DBres = await Chats.findOne(
    { username: req.user.username },
    { chats: 1 }
  );

  let chatList = await Promise.all(
    [...DBres.chats].map(async (chat) => {
      let { status } = await User.findOne({ username: chat[0] }, { status: 1 });
      return {
        user: chat[0],
        status,
      };
    })
  );

  res.status(200).json({
    status: "success",
    chatList,
  });
});

exports.getMessages = catchAsync(async (req, res) => {
  const reqUser = req.query.username;
  const { chats } = await Chats.findOne(
    { username: req.user.username },
    { [`chats.${reqUser}`]: 1 }
  );
  const messages = chats.get(reqUser);
  res.status(200).json({
    status: "success",
    messages,
  });
});
