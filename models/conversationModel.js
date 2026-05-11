const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: {
    type: Array,
  },
  lastChat: {
    type: String,
  },
  lastChatTime:{
    type: Date,
  },
  unreads: {
    type: Number,
    default: 0,
  },
  unreadBy: {
    type: String,
    default: ""
  }
})

module.exports = mongoose.model('Conversations', conversationSchema, "conversations");

