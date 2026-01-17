const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // firstName : Prénom (User) ou Nom de l'entreprise (Company)
    firstName: { type: String, required: true, trim: true },
    
    // lastName : Optionnel pour les entreprises
    lastName: { type: String, required: false, trim: true },

    email: { type: String, required: true, unique: true },
    password: { type: String },
    
    // --- SYSTÈME DE RÔLES ET MODÉRATION ---
    role: { 
        type: String, 
        enum: ['user', 'company', 'admin'], 
        default: 'user' 
    },
    isBanned: { type: Boolean, default: false },
    
    // Référence pour l'entreprise vers son dirigeant ou compte admin associé
    ceo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    googleId: { type: String, unique: true, sparse: true },

    // --- PROFIL ET BIO ---
    headline: { type: String, default: 'New Member at ProNetwork' },
    location: { type: String, default: 'Not specified' }, 
    about: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    
    // --- CV ET COMPÉTENCES (Principalement pour 'user') ---
    skills: [{ type: String }],
    
    experiences: [{
        title: String,
        company: String,
        duration: String,
        description: String
    }],

    education: [{
        degree: String,
        university: String,
        year: String,
        location: String
    }],

    languages: [{
        name: String,
        level: String
    }],

    // --- INFORMATIONS DE CONTACT ---
    contactInfo: {
        phone: String,
        linkedin: String,
        github: String,
        website: String // Crucial pour les fiches entreprises
    },

    // --- RÉSEAU SOCIAL (Hybride : Connexions + Follow) ---
    // Pour les relations mutuelles (type LinkedIn / Amis)
    connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    connectionsCount: { type: Number, default: 0 },

    // Pour le suivi unilatéral (type Twitter / Page Entreprise)
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);