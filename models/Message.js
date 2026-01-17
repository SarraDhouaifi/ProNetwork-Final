const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    // ID de la conversation parente (Essentiel pour grouper les messages entre deux utilisateurs)
    conversationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Conversation',
        required: true // Recommandé pour éviter les messages orphelins
    },
    // L'envoyeur du message
    sender: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // Le destinataire
    receiver: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // Le contenu (Texte du message)
    content: { 
        type: String, 
        required: true 
    },
    // Référence à un post partagé (C'est ce qui fera marcher votre bouton "Send")
    sharedPost: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Post',
        default: null
    }, 
    // État de lecture
    isRead: { 
        type: Boolean, 
        default: false 
    }
}, { 
    timestamps: true // Génère automatiquement createdAt (date d'envoi) et updatedAt
});

module.exports = mongoose.model('Message', messageSchema);