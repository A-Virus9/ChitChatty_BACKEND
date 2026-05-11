const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  caller: {
    type: String,
    required: true
  },
  callee: {
    type: String,
    required: true
  },
  isAccepted: {
    type: Boolean,
    required: true,
    default: false,
  },
  duration: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("Calls", callSchema, "calls");