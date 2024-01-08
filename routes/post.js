const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    file: String,
    topic: String,
    username: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("post", postSchema);