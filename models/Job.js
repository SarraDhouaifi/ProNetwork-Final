const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    company: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // On lie l'offre à l'entreprise (User avec role='company')
        required: true 
    },
    location: { type: String, default: 'Remote' },
    type: { type: String, default: 'Full-time' }, // Full-time, Contract, etc.
    description: String,
    applicants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', jobSchema);