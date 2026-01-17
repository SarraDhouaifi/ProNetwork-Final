const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const bcrypt = require('bcryptjs');

// MODÈLES
const User = require('../models/User');
const Post = require('../models/Post');
const Job = require('../models/Job');
const Connection = require('../models/Connection');
const Notification = require('../models/Notification');
const Preference = require('../models/Preference');
const Block = require('../models/Block');

// CONTRÔLEURS
const authController = require('../controllers/authController');

// ============================================================
// CONFIGURATION MULTER
// ============================================================
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        const cleanName = file.fieldname + '-' + Date.now() + path.extname(file.originalname);
        cb(null, cleanName);
    }
});

const upload = multer({
    storage: storage, 
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|pdf|jfif|mp4/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype) || file.mimetype === 'application/octet-stream';
        if (mimetype && extname) return cb(null, true);
        cb(new Error(`Error: File upload only supports: ${filetypes}`));
    }
});

const uploadFields = upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'resume', maxCount: 1 },
    { name: 'postImage', maxCount: 1 }
]);

// Helper pour récupérer l'utilisateur courant
const getCurrentUser = (req) => req.user || req.session.user;

// ============================================================
// ROUTES AUTHENTIFICATION & RACINE
// ============================================================
router.get('/', (req, res) => {
    if (getCurrentUser(req)) return res.redirect('/feed');
    res.redirect('/login');
});

router.get('/login', (req, res) => {
    if (getCurrentUser(req)) return res.redirect('/feed');
    res.render('auth/login');
});

router.post('/login', authController.loginUser);

router.get('/register', (req, res) => {
    if (getCurrentUser(req)) return res.redirect('/feed');
    res.render('auth/select-role');
});

router.get('/register/user', (req, res) => {
    if (getCurrentUser(req)) return res.redirect('/feed');
    res.render('auth/register-user');
});

router.post('/register/user', authController.registerUser);

router.get('/register/company', (req, res) => {
    if (getCurrentUser(req)) return res.redirect('/feed');
    res.render('auth/register-company');
});

router.post('/register/company', authController.registerCompany);

router.get('/forgot-password', (req, res) => res.render('auth/forgot-password'));
router.post('/forgot-password', authController.forgotPassword);

router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error(err);
        if (req.session) {
            req.session.destroy(() => res.redirect('/login'));
        } else {
            res.redirect('/login');
        }
    });
});

// ============================================================
// PROFIL ET RÉSEAU
// ============================================================


router.get('/user/:id', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');

    try {
        const viewerId = (currentUser._id || currentUser.id).toString();
        const profileId = req.params.id;
        if (viewerId === profileId) return res.redirect('/profile');

        const profileUser = await User.findById(profileId).populate('ceo', 'firstName lastName profilePicture headline');
        if (!profileUser) return res.status(404).render('error', { message: 'User not found' });

        const isBlocked = await Block.findOne({
            $or: [{ blocker: viewerId, blocked: profileId }, { blocker: profileId, blocked: viewerId }]
        });
        if (isBlocked) return res.render('profile/blocked-profile', { profileUser, user: currentUser });

        let connectionStatus = 'none';
        const existingConnection = await Connection.findOne({
            $or: [{ sender: viewerId, receiver: profileId }, { sender: profileId, receiver: viewerId }]
        });
        if (existingConnection) {
            if (existingConnection.status === 'accepted') connectionStatus = 'connected';
            else if (existingConnection.sender.toString() === viewerId) connectionStatus = 'request_sent';
            else connectionStatus = 'request_received';
        }

        const posts = await Post.find({ author: profileId }).populate('author', 'firstName lastName headline profilePicture').sort({ createdAt: -1 });
        const followersCount = await Connection.countDocuments({ 
            $or: [{ sender: profileId }, { receiver: profileId }], status: 'accepted' 
        });

        if (profileUser.role === 'company') {
            const jobs = await Job.find({ company: profileId }).sort({ createdAt: -1 });
            res.render('profile/company', { company: profileUser, user: currentUser, isOwner: false, posts, jobs, connectionStatus, followersCount });
        } else {
            const viewerUser = await User.findById(viewerId);
            const mutuals = profileUser.connections ? profileUser.connections.filter(id => viewerUser.connections.includes(id)) : [];
            res.render('profile/profile-public', { user: currentUser, profileUser, connectionStatus, followersCount, posts, mutualConnections: mutuals.length });
        }
    } catch (error) { res.redirect('/feed'); }
});

// ============================================================
// FLUX (FEED)
// ============================================================
router.get('/feed', async (req, res) => {
    const sessionUser = getCurrentUser(req);
    if (!sessionUser) return res.redirect('/login');

    try {
        const userId = sessionUser._id || sessionUser.id;
        const user = await User.findById(userId).lean();
        
        const [posts, jobs] = await Promise.all([
            Post.find()
                .sort({ createdAt: -1 })
                .populate('author', 'firstName lastName profilePicture headline role companyName')
                .populate({
                    path: 'sharedPost',
                    populate: { path: 'author', select: 'firstName lastName profilePicture' }
                }).lean(),
            Job.find().sort({ createdAt: -1 }).populate('company', 'firstName companyName profilePicture location').lean()
        ]);

        const feedItems = [
            ...posts.map(p => ({ ...p, docType: 'post' })),
            ...jobs.map(j => ({ ...j, docType: 'job' }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.render('feed/index', { user, feedItems });
    } catch (error) {
        console.error("Erreur Feed:", error);
        res.redirect('/login');
    }
});

// ============================================================
// GESTION DES POSTS
// ============================================================
router.post('/post/create', uploadFields, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.status(401).json({ success: false });
    try {
        const { text } = req.body;
        let image = req.files['postImage'] ? `/uploads/${req.files['postImage'][0].filename}` : '';
        const newPost = new Post({ author: currentUser._id || currentUser.id, text, image });
        await newPost.save();
        await newPost.populate('author', 'firstName lastName profilePicture headline');
        res.status(200).json({ success: true, post: newPost });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/post/:id/like', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const post = await Post.findById(req.params.id);
        const userId = (currentUser._id || currentUser.id).toString();
        const index = post.likes.indexOf(userId);
        let action = index === -1 ? 'liked' : 'unliked';

        if (index === -1) {
            post.likes.push(userId);
            if (post.author.toString() !== userId) {
                await Notification.create({ recipient: post.author, sender: userId, type: 'like', post: post._id });
                const io = req.app.get('io');
                if(io) io.to(post.author.toString()).emit('new_notification');
            }
        } else {
            post.likes.splice(index, 1);
        }
        await post.save();
        res.json({ success: true, likesCount: post.likes.length, action });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/post/:id/comment', uploadFields, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const post = await Post.findById(req.params.id);
        const userId = currentUser._id || currentUser.id;
        const user = await User.findById(userId);
        post.comments.push({ user: userId, text: req.body.commentText, userName: user.firstName });
        await post.save();
        if (post.author.toString() !== userId.toString()) {
            await Notification.create({ recipient: post.author, sender: userId, type: 'comment', post: post._id });
            const io = req.app.get('io');
            if(io) io.to(post.author.toString()).emit('new_notification');
        }
        res.json({ success: true, commentsCount: post.comments.length, userName: user.firstName });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/post/:id/share', async (req, res) => {
    const sessionUser = getCurrentUser(req);
    if (!sessionUser) return res.status(401).json({ success: false });
    try {
        const originalPost = await Post.findById(req.params.id);
        if (!originalPost) return res.status(404).json({ success: false });
        const userId = sessionUser._id || sessionUser.id;
        const sharedPostEntry = new Post({
            author: userId,
            sharedPost: originalPost._id,
            text: req.body.sharedText || ''
        });
        await sharedPostEntry.save();
        originalPost.shares = (originalPost.shares || 0) + 1;
        await originalPost.save();
        if (originalPost.author.toString() !== userId.toString()) {
            await Notification.create({ recipient: originalPost.author, sender: userId, type: 'share', post: originalPost._id });
            const io = req.app.get('io');
            if (io) io.to(originalPost.author.toString()).emit('new_notification');
        }
        res.json({ success: true, sharesCount: originalPost.shares });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// RÉSEAU & SUGGESTIONS
// ============================================================
router.get('/api/connections', async (req, res) => {
    const sessionUser = getCurrentUser(req);
    if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const userId = sessionUser._id || sessionUser.id;
        const connections = await Connection.find({
            status: 'accepted',
            $or: [{ sender: userId }, { receiver: userId }]
        }).populate('sender receiver', 'firstName lastName profilePicture headline');
        const friends = connections.map(conn => 
            conn.sender._id.toString() === userId.toString() ? conn.receiver : conn.sender
        );
        res.json(friends);
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

router.post('/connect/:id', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.status(401).json({ success: false });
    try {
        const senderId = currentUser._id || currentUser.id;
        const receiverId = req.params.id;
        const newConnection = new Connection({ sender: senderId, receiver: receiverId, status: 'pending' });
        await newConnection.save();
        await Notification.create({ recipient: receiverId, sender: senderId, type: 'connection_request' });
        const io = req.app.get('io');
        if(io) io.to(receiverId.toString()).emit('new_notification');
        res.json({ success: true, status: 'request_sent' });
    } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/accept/:senderId', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.status(401).json({ success: false });
    try {
        const receiverId = currentUser._id || currentUser.id;
        const senderId = req.params.senderId;
        const connection = await Connection.findOne({ sender: senderId, receiver: receiverId, status: 'pending' });
        if (!connection) return res.status(404).json({ success: false });
        connection.status = 'accepted';
        await connection.save();
        await User.findByIdAndUpdate(receiverId, { $addToSet: { connections: senderId } });
        await User.findByIdAndUpdate(senderId, { $addToSet: { connections: receiverId } });
        await Notification.create({ recipient: senderId, sender: receiverId, type: 'connection_accepted' });
        res.json({ success: true, status: 'connected' });
    } catch (err) { res.status(500).json({ success: false }); }
});

router.get('/network', async (req, res) => {
    const sessionUser = getCurrentUser(req);
    if (!sessionUser) return res.redirect('/login');
    try {
        const user = await User.findById(sessionUser._id || sessionUser.id).lean();
        const userId = user._id.toString();
        const invitations = await Connection.find({ receiver: userId, status: 'pending' }).populate('sender', 'firstName lastName profilePicture headline').lean();
        const connections = await Connection.find({ status: 'accepted', $or: [{ sender: userId }, { receiver: userId }] }).populate('sender receiver', 'firstName lastName profilePicture headline').lean();
        const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });
        res.render('network/network', { user, invitations, connections, suggestions: [], unreadCount });
    } catch (err) { res.redirect('/feed'); }
});

// ============================================================
// ÉDITION & NOTIFICATIONS
// ============================================================
router.get('/notifications', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');
    try {
        const userId = currentUser._id || currentUser.id;
        const notifications = await Notification.find({ recipient: userId }).sort({ createdAt: -1 }).populate('sender', 'firstName lastName profilePicture headline').populate('post').lean();
        await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
        res.render('notifications', { user: await User.findById(userId).lean(), notifications });
    } catch (err) { res.redirect('/feed'); }
});

router.get('/profile/edit', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');
    const user = await User.findById(currentUser._id || currentUser.id).populate('ceo').lean();
    res.render('profile/edit', { user });
});

router.post('/profile/edit', uploadFields, async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');
    try {
        const user = await User.findById(currentUser._id || currentUser.id);
        const { headline, location, about, phone, linkedin, github, skills } = req.body;
        user.headline = headline;
        user.location = location;
        user.about = about;
        user.contactInfo = { phone, linkedin, github };
        if (skills) user.skills = skills.split(',').map(s => s.trim());
        if (req.files['profilePicture']) user.profilePicture = `/uploads/${req.files['profilePicture'][0].filename}`;
        await user.save();
        res.redirect('/profile');
    } catch (error) { res.status(500).send("Server Error"); }
});

// ============================================================
// PDF & EXPORT
// ============================================================
router.get('/profile/download-cv', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');
    try {
        const user = await User.findById(currentUser._id || currentUser.id).lean();
        const html = await ejs.renderFile(path.join(__dirname, '../views/pdf/resume.ejs'), { user });
        const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html);
        const pdf = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();
        res.setHeader('Content-type', 'application/pdf');
        res.send(pdf);
    } catch (e) { res.status(500).send("Error generating CV"); }
});

module.exports = router;