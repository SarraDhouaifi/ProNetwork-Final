const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    // Auteur du post
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Système de partage (le post original)
    sharedPost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        default: null
    },

    // Texte ajouté lors du partage
    sharedText: {
        type: String,
        default: ''
    },

    // Contenu du post original
    text: { type: String, trim: true },
    image: { type: String, default: '' },
    video: { type: String, default: '' },

    // Interactions
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    shares: { type: Number, default: 0 },

    // Système de commentaires imbriqués
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        text: { type: String, default: '' },
        image: { type: String, default: '' },
        video: { type: String, default: '' },
        
        likes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],

        // Réponses aux commentaires
        replies: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            text: {
                type: String,
                required: true
            },
            likes: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }],
            createdAt: {
                type: Date,
                default: Date.now
            }
        }],

        createdAt: {
            type: Date,
            default: Date.now
        }
    }]

}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);