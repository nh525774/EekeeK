const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        receiverId: { type: String, required: true },
        type: { type: String, default: "info"},
        message: { type: String },
        data: { type: Object, default: {} },
        createdAt: { type: Date, default: Date.now },
    });

module.exports = mongoose.model("Notification", notificationSchema);