const catchAsync = require("../utils/catchAsync");
const User = require("../models/userModel");
const Chats = require("../models/chatModel");
const Conversations = require("../models/conversationModel");


exports.getMessages = catchAsync(async (req, res) => {
  const reqUser = req.query.username;
  let chats = await Chats.find({
    $or: [
      { sender: req.user.username, receiver: reqUser },
      { sender: reqUser, receiver: req.user.username },
    ]
  });
  
  chats = chats.map((e) => {
    return {
      type: e.sender == req.user.username? "send" : "receive",
      message: e.message,
      time: e.time
    }
  })
  res.status(200).json({
    status: "success",
    chats,
  });
});
