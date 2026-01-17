const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Notification = require('../models/Notification'); // Import indispensable

// --- FONCTION UTILITAIRE ---
function getCurrentUser(req) {
    const user = req.user || req.session?.user;
    if (!user) return null;
    if (!user._id && user.id) user._id = user.id;
    return user;
}

// --- 1. INBOX (Liste des discussions) ---
router.get('/', async (req, res) => {
    const user = getCurrentUser(req);
    if (!user || !user._id) return res.redirect('/login');

    if (req.query.conversationId) {
        return res.redirect('/messages/t/' + req.query.conversationId);
    }

    try {
        const conversations = await Conversation.find({ participants: user._id })
            .populate('participants', 'firstName lastName profilePicture companyName')
            .sort({ lastMessageAt: -1 })
            .lean();
        
        const cleanConversations = conversations.filter(c => c.participants && c.participants.length > 0);
        
        res.render('messages/inbox', { 
            conversations: cleanConversations, 
            user: user, 
            currentConv: null, 
            messages: [] 
        });
    } catch (err) {
        console.error("Erreur Inbox:", err);
        res.redirect('/');
    }
});

// --- 2. CHAT (Afficher une conversation spécifique) ---
router.get('/t/:id', async (req, res) => {
    const user = getCurrentUser(req);
    if (!user || !user._id) return res.redirect('/login');

    try {
        const currentConv = await Conversation.findById(req.params.id)
            .populate('participants', 'firstName lastName profilePicture companyName')
            .lean();

        if (!currentConv) return res.redirect('/messages');

        const isParticipant = currentConv.participants.some(p => p._id.toString() === user._id.toString());
        if (!isParticipant) return res.redirect('/messages');

        const conversations = await Conversation.find({ participants: user._id })
            .populate('participants', 'firstName lastName profilePicture companyName')
            .sort({ lastMessageAt: -1 })
            .lean();

        const messages = await Message.find({ conversationId: req.params.id })
            .sort({ createdAt: 1 })
            .lean();

        res.render('messages/inbox', { 
            user: user, 
            conversations: conversations.filter(c => c.participants && c.participants.length > 0), 
            currentConv, 
            messages 
        });
    } catch (err) {
        res.redirect('/messages');
    }
});

// --- 3. SEND (Envoyer un message + NOTIFICATION) ---
router.post('/send', async (req, res) => {
    const user = getCurrentUser(req);
    if (!user || !user._id) return res.redirect('/login');

    const { receiverId, content, conversationId } = req.body;
    const senderId = user._id.toString();

    try {
        let conv;
        if (conversationId) {
            conv = await Conversation.findById(conversationId);
        } else if (receiverId) {
            conv = await Conversation.findOne({
                participants: { $all: [senderId, receiverId] }
            });
        }

        if (!conv) {
            if (!receiverId) throw new Error("Destinataire manquant");
            conv = new Conversation({ participants: [senderId, receiverId] });
        }

        let finalReceiverId = receiverId;
        if (!finalReceiverId && conv.participants) {
            const other = conv.participants.find(p => p && p.toString() !== senderId);
            finalReceiverId = other ? other.toString() : null;
        }

        if (!finalReceiverId) throw new Error("Impossible de déterminer le destinataire");

        const newMessage = new Message({
            conversationId: conv._id,
            sender: senderId,
            receiver: finalReceiverId,
            content: content
        });

        conv.lastMessage = content;
        conv.lastMessageAt = Date.now();

        await Promise.all([newMessage.save(), conv.save()]);

        // ==========================================
        // LOGIQUE DE NOTIFICATION AJOUTÉE ICI
        // ==========================================
        const newNotif = new Notification({
            recipient: finalReceiverId,
            sender: senderId,
            type: 'new_message'
        });
        await newNotif.save();

        // Envoi temps réel via Socket.io
        const io = req.app.get('socketio');
        if (io) {
            io.to(finalReceiverId).emit('new_notification');
        }
        // ==========================================

        res.redirect('/messages/t/' + conv._id);
    } catch (err) {
        console.error("Erreur Send Message:", err);
        res.redirect('/messages');
    }
});

// --- 4. START (Créer une discussion) ---
router.get('/start/:userId', async (req, res) => {
    const user = getCurrentUser(req);
    const targetUserId = req.params.userId;
    if (!user || !user._id) return res.redirect('/login');

    try {
        let conv = await Conversation.findOne({
            participants: { $all: [user._id, targetUserId] }
        });

        if (!conv) {
            conv = new Conversation({ 
                participants: [user._id, targetUserId],
                lastMessage: "Started a conversation",
                lastMessageAt: Date.now()
            });
            await conv.save();
        }
        res.redirect('/messages/t/' + conv._id);
    } catch (err) {
        res.redirect('/messages');
    }
});

// --- 5. SEARCH (Recherche d'utilisateurs) ---
router.get('/search-users', async (req, res) => {
    const query = req.query.q;
    const user = getCurrentUser(req);
    if (!user || !query) return res.json([]);

    try {
        const users = await User.find({
            $and: [
                { _id: { $ne: user._id } }, 
                {
                    $or: [
                        { firstName: { $regex: query, $options: 'i' } },
                        { lastName: { $regex: query, $options: 'i' } }
                    ]
                }
            ]
        }).limit(5).select('firstName lastName profilePicture companyName');
        res.json(users);
    } catch (err) {
        res.json([]);
    }
});

module.exports = router;