const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: String },
    lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index pour accélérer la recherche des conversations d'un utilisateur
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);