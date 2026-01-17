const User = require('../models/User');
const Post = require('../models/Post'); 
const Job = require('../models/Job');

const getCurrentUser = (req) => req.user || req.session.user;

exports.globalSearch = async (req, res) => {
    try {
        // 1. VERIFICATION UTILISATEUR
        const currentUserSession = getCurrentUser(req);
        if (!currentUserSession) return res.redirect('/login');

        // On récupère l'utilisateur complet pour la navbar (notifs, connections)
        const user = await User.findById(currentUserSession._id || currentUserSession.id);

        // 2. LOGIQUE DE RECHERCHE
        const queryValue = req.query.q || ''; 
        const type = req.query.type || 'posts'; 
        const regex = new RegExp(queryValue, 'i');

        let results = [];

        // --- CAS 1 : Recherche de GENS ---
        if (type === 'people') {
            results = await User.find({
                role: 'user', 
                $or: [
                    { firstName: regex },
                    { lastName: regex },
                    { headline: regex }
                ]
            })
            .select('firstName lastName profilePicture headline role location')
            .lean();
        } 
        
        // --- CAS 2 : Recherche d'ENTREPRISES ---
        else if (type === 'companies') {
            results = await User.find({
                role: 'company',
                $or: [
                    { firstName: regex }, 
                    { companyName: regex }, 
                    { headline: regex }
                ]
            })
            .select('firstName companyName profilePicture headline role location')
            .lean();
        } 

        // --- CAS 3 : Recherche de JOBS ---
        else if (type === 'jobs') {
            results = await Job.find({ 
                $or: [
                    { title: regex },
                    { description: regex },
                    { location: regex }
                ]
            })
            .populate('company', 'firstName companyName profilePicture') 
            .lean();
        } 
        
        // --- CAS 4 : Recherche de POSTS ---
        else {
            results = await Post.find({ text: regex })
                .populate('author', 'firstName lastName profilePicture role companyName headline') 
                .populate('comments.user', 'firstName lastName')
                .sort({ createdAt: -1 })
                .lean();
        }

        // 3. RENDU DE LA VUE - SYNCHRONISATION DES VARIABLES
        // C'est ici que searchQuery est défini pour l'EJS
        res.render('search-results', { 
            results: results, 
            type: type, 
            searchQuery: queryValue, // <--- Défini ici pour corriger votre erreur EJS
            user: user 
        });

    } catch (error) {
        console.error('Search error:', error);
        res.redirect('/feed');
    }
};