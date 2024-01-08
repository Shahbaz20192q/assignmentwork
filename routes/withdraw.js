const mongoose = require('mongoose');

const withdrawSchema = mongoose.Schema({
    bankName: String,
    accountNo: String,
    amount: String,
    accountHolder: String,
    status:{
        type:String,
        default:"Pending"
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

module.exports = mongoose.model("withdraw", withdrawSchema);