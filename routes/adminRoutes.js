const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');

// --- MIDDLEWARE DE SÉCURITÉ ---
const isAdmin = (req, res, next) => {
    const currentUser = req.user || req.session.user;
    if (currentUser && currentUser.role === 'admin') {
        return next();
    }
    res.status(403).render('error', { message: "Accès refusé : Réservé à l'administrateur." });
};

// --- ROUTES ---

// 1. Affichage du Dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        const allUsers = await User.find({ email: { $ne: 'admin@gmail.com' } }).sort({ createdAt: -1 });
        const allPosts = await Post.find().populate('author', 'firstName lastName');

        // Notez l'utilisation des noms de variables attendus par votre EJS
        res.render('admin/dashboard', { 
            users: allUsers, 
            posts: allPosts 
        });
    } catch (err) {
        console.error(err);
        res.redirect('/feed');
    }
});

// 2. Action : Bannir / Débannir
router.post('/user/:id/toggle-ban', isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.isBanned = !user.isBanned; 
            await user.save();
        }
        res.redirect('/admin/dashboard');
    } catch (err) {
        res.status(500).send("Erreur lors de l'action");
    }
});

// 3. Action : Supprimer définitivement un utilisateur
router.post('/user/:id/delete', isAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.redirect('/admin/dashboard');
    } catch (err) {
        res.status(500).send("Erreur lors de la suppression");
    }
});

// 4. Action : Supprimer un commentaire
router.post('/post/:postId/comment/:commentId/delete', isAdmin, async (req, res) => {
    try {
        await Post.findByIdAndUpdate(req.params.postId, {
            $pull: { comments: { _id: req.params.commentId } }
        });
        res.redirect('/admin/dashboard');
    } catch (err) {
        res.status(500).send("Erreur lors de la suppression du commentaire");
    }
});

module.exports = router;