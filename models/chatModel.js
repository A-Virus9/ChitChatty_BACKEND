const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true
  },
  lastChat: {
    type: Map,
    of: Object
  },
  chats: {
    type: Map,
    of: Object
  }
})

module.exports = mongoose.model('Chats', chatSchema, "chats");