const mongoose = require('mongoose');
const plm = require("passport-local-mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/assignmentWork");

const userSchema = mongoose.Schema({
  firstName: String,
  lastName: String,
  username: {
    type: String,
    unique: true,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  mobileNumber: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
  },
  gender: String,
  date: {
    type: Date,
    default: Date.now
  },
  assignment: {
    type: Number,
    default: 0
  },
  income: {
    type: Number,
    default: 0
  },
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post"
    }
  ],
  deposit: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "deposit"
    }
  ],
  withdraw: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "withdraw"
    }
  ],
  referralCode: { type: String },
  refrring: String,
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user"
    }
  ],
  verified: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  plane: String,
  profileImage: {
    type: String,
    default: "defouldprofilepic.png"
  },

  resetPasswordToken: String,
  resetPasswordExpires: Date
});

userSchema.plugin(plm);
module.exports = mongoose.model("user", userSchema);