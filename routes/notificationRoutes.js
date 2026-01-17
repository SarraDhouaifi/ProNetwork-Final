const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Connection = require('../models/Connection');
const User = require('../models/User');

// ---------------------------------------------------------
// 1. VUE : Page des notifications (Rendu HTML)
// ---------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user?._id;
        if (!userId) return res.redirect('/login');

        // Récupérer toutes les notifications avec détails
        const notifications = await Notification.find({ recipient: userId })
            .populate('sender', 'firstName lastName profilePicture')
            .populate('post')
            .sort({ createdAt: -1 });

        // Marquer automatiquement comme lues lors de l'ouverture
        await Notification.updateMany(
            { recipient: userId, isRead: false }, 
            { isRead: true }
        );

        res.render('notifications', { 
            user: req.user || req.session.user, 
            notifications 
        });
    } catch (error) {
        console.error("Error loading notifications page:", error);
        res.redirect('/feed');
    }
});

// ---------------------------------------------------------
// 2. API : Routes pour AJAX / Frontend dynamique
// ---------------------------------------------------------

// Récupérer les notifications en format JSON
router.get('/data', async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user?._id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const notifications = await Notification.find({ recipient: userId })
            .populate('sender', 'firstName lastName profilePicture')
            .populate('post')
            .sort({ createdAt: -1 });

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Marquer une notification spécifique comme lue
router.post('/:id/read', async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ACCOEPTER UNE INVITATION (Version Corrigée)
router.post('/accept/:senderId', async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user?._id;
        const senderId = req.params.senderId;

        if (!userId) return res.status(401).json({ success: false });

        // 1. Mettre à jour le statut de la connexion en 'accepted'
        const connection = await Connection.findOneAndUpdate(
            { sender: senderId, receiver: userId, status: 'pending' },
            { status: 'accepted' },
            { new: true }
        );

        if (!connection) {
            return res.status(404).json({ success: false, message: "Invitation introuvable" });
        }

        // 2. Ajouter mutuellement les IDs dans les tableaux 'connections' des Users
        await User.findByIdAndUpdate(userId, { $addToSet: { connections: senderId } });
        await User.findByIdAndUpdate(senderId, { $addToSet: { connections: userId } });

        // 3. Supprimer la notification de demande
        await Notification.deleteOne({ 
            recipient: userId, 
            sender: senderId, 
            type: 'connection_request' 
        });

        // 4. (Optionnel) Créer une notification pour l'expéditeur
        await Notification.create({
            recipient: senderId,
            sender: userId,
            type: 'connection_accepted'
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Accept Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// IGNORER UNE INVITATION (Version Corrigée)
router.post('/reject/:senderId', async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user?._id;
        const senderId = req.params.senderId;

        if (!userId) return res.status(401).json({ success: false });

        // 1. Supprimer la demande de connexion de la base
        await Connection.deleteOne({ sender: senderId, receiver: userId, status: 'pending' });

        // 2. Supprimer la notification
        await Notification.deleteOne({ 
            recipient: userId, 
            sender: senderId, 
            type: 'connection_request' 
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Marquer TOUT comme lu
router.post('/mark-all-read', async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user?._id;
        await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;