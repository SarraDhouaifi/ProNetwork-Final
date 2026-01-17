const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // L'utilisateur qui reçoit la notification
    recipient: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // L'utilisateur qui a fait l'action
    sender: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // ✅ LE CHAMP MANQUANT : Référence au post concerné
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        default: null
    },
    // Type d'action
    type: { 
        type: String, 
        enum: [
            'connection_request', 
            'connection_accepted', 
            'connection_removed',
            'like', 
            'comment', 
            'share',
            'share_private',
            'new_message'
        ], 
        required: true 
    },
    isRead: { 
        type: Boolean, 
        default: false 
    },
    // Pour stocker d'autres IDs si besoin (ex: un ID de commentaire)
    relatedId: {
        type: mongoose.Schema.Types.ObjectId
    }
}, { 
    timestamps: true 
});
module.exports = mongoose.model('Notification', notificationSchema);