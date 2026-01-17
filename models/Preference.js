const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    
    careerGoal: { 
        type: String, 
        enum: ['student', 'job_seeker', 'freelancer', 'recruiter', 'networking'],
        default: 'networking'
    },

    jobTypes: [{ type: String }], 
    domains: [{ type: String }], 
    
    contentInterests: [{ type: String }],
    
    locationPreference: {
        country: { type: String, default: '' },
        workType: { type: String, enum: ['remote', 'onsite', 'hybrid'], default: 'hybrid' }
    }
}, { timestamps: true });

module.exports = mongoose.model('Preference', preferenceSchema);