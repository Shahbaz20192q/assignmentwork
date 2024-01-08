const mongoose = require('mongoose');

const depositSchema = mongoose.Schema({
    depositNo: String,
    method: String,
    bankName: String,
    accountNo: String,
    amount: {
        type: String,
        default: "0"
    },
    accountHolder: String,
    secreenShot: String,
    plane: String,
    tid: {
        type: String,
        uniqued: true
    },
    reason: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        default: "Pending"
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    reason: {
        type: String,
        default: ""
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("deposit", depositSchema);