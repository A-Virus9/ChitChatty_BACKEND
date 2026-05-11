const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true
  },
  receiver: {
    type: String,
    required: true
  },
  message: {
    type: String,
  },
  time: {
    type: Date,
    required: true
  }
})

module.exports = mongoose.model('Messages', chatSchema, "messages");