const mongoose = require('mongoose');
const plm = require("passport-local-mongoose")

const admainSchema = mongoose.Schema({
  firstName: String,
  lastName: String,
  username: {
    type: String,
  },

  email: {
    type: String,
  },

  mobileNumber: {
    type: Number,
  },

  password: {
    type: String,
  },

  gender: String,

  date: {
    type: Date,
    default: Date.now
  },
  profileImage: String,
});

admainSchema.plugin(plm);
module.exports = mongoose.model("admain", admainSchema);