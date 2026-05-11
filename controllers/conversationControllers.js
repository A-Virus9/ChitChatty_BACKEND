const catchAsync = require("../utils/catchAsync");
const Conversations = require("../models/conversationModel");
const Users = require("../models/userModel");

exports.getConversations = catchAsync(async (req, res) => {
  const DBres = await Conversations.find(
    { participants: req.user.username },
    { _id: 0 },
  );

  const formatted = await Promise.all(DBres.map(async(e) => {
    const username = e.participants.find((user) => user != req.user.username)
    const {status} = await Users.findOne({username})
    
    return {
      lastChat: e.lastChat,
      lastChatTime: e.lastChatTime,
      unreads: e.unreadBy == req.user.username ?e.unreads: 0,
      username,
      status
    };
  }))

  res.status(200).json({
    status: "success",
    conversationList: formatted,
  });
});

exports.addChat = catchAsync(async (req, res) => {
  const sender = req.user.username;
  const receiver = req.body.newUser;

  const convos = await Conversations.exists({
    participants:{
      $all: [sender, receiver]
    }
  }
  );

  let status, code, receiverData;

  if(!convos){
    receiverData = await Users.findOne({username: receiver})
    if(receiverData){
      await Conversations.create({
        participants: [sender, receiver],
        lastChat: "",
        lastChatTime: Date.now()
      })
      status = "added"
      code = 200
    }
    else{status = "user absent"; code = 404}
  }
  else if(convos){
    status = "already present"; code = 409
  }
  else{status = "failure"; code = 500}
  res.status(code).json({status, userStatus: receiverData.status})
});
