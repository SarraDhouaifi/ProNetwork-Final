const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Job = require('../models/Job');
const Connection = require('../models/Connection');

// Middleware pour vérifier la connexion
const ensureAuthenticated = (req, res, next) => {
    if (req.user || req.session.user) {
        return next();
    }
    res.redirect('/login');
};


// ROUTE : /profile
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const currentUser = req.user || req.session.user;
        const userId = currentUser._id || currentUser.id;

        const user = await User.findById(userId).populate('ceo');

        const [posts, followersCount] = await Promise.all([
            Post.find({ author: userId }).sort({ createdAt: -1 }).lean(),
            Connection.countDocuments({
                $or: [{ sender: userId }, { receiver: userId }],
                status: 'accepted'
            })
        ]);

        const viewPath = user.role === 'company'
            ? 'profile/company'
            : 'profile/profile';
        let jobs = [];
        if(user.role === 'company') {
            jobs = await Job.find({ company: user._id }).sort({ createdAt: -1 }).lean();
        }

        res.render(viewPath, {
            user,
            profileUser: user,
            company: user,
            posts: posts || [],
            followersCount: followersCount || 0,
            isOwner: true,
            connectionStatus: null,
            mutualConnections: 0,
            experiences: user.experiences || [],
            jobs: jobs || [],
            skills: user.skills || []
        });

    } catch (err) {
        console.error("Erreur Profile:", err);
        res.status(500).send("Erreur lors du chargement du profil");
    }
});


// ROUTE : /profile/view/:id (Pour voir les autres)
router.get('/view/:id', ensureAuthenticated, async (req, res) => {
    try {
        const profileId = req.params.id;
        if (profileId === req.user._id.toString()) return res.redirect('/profile');

        const visitedUser = await User.findById(profileId).populate('ceo');
        const posts = await Post.find({ author: profileId }).sort({ createdAt: -1 }).lean();
        
        const viewPath = visitedUser.role === 'company' ? 'profile/company' : 'profile/profile';

        res.render(viewPath, {
            user: req.user,
            profileUser: visitedUser,
            company: visitedUser,
            isOwner: false,
            posts: posts,
            followersCount: 0, // À calculer si besoin
            connectionStatus: 'none'
        });
    } catch (err) {
        res.redirect('/feed');
    }
});

module.exports = router;