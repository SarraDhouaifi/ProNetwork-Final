const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    companyName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    industry: { type: String, default: '' },
    location: { type: String, default: '' },
    website: { type: String, default: '' },
    about: { type: String, default: '' },
    logo: { type: String, default: '' },
    role: { type: String, default: 'company' },
    jobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }]
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);