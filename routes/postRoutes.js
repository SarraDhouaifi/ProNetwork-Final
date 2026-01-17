const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Needed for validation
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const multer = require('multer');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Middleware to prevent CastError: ObjectId failed for value "null"
const validateIds = (req, res, next) => {
    const ids = [req.params.postId, req.params.commentId, req.params.replyId].filter(Boolean);
    for (const id of ids) {
        if (id === 'null' || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: `Invalid ID: ${id}` });
        }
    }
    next();
};

const storage = multer.diskStorage({
    destination: './public/assets/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });
const uploadFields = upload.fields([
    { name: 'commentImage', maxCount: 1 },
    { name: 'commentVideo', maxCount: 1 }
]);

// ==========================================
// ROUTES
// ==========================================

router.post('/:postId/like', validateIds, async (req, res) => {
    const user = req.user || req.session.user;
    if (!user) return res.status(401).json({ success: false });

    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.json({ success: false, message: "Post non trouvé" });

        const userId = (user._id || user.id).toString();
        const index = post.likes.findIndex(id => id.toString() === userId);

        let action;
        if (index !== -1) {
            post.likes.splice(index, 1);
            action = 'unliked';
        } else {
            post.likes.push(userId);
            action = 'liked';

            // Notification
            if (post.author.toString() !== userId) {
                await Notification.create({
                    recipient: post.author,
                    sender: userId,
                    post: post._id,
                    type: 'like'
                });
            }
        }

        await post.save();
        res.json({ success: true, action, likesCount: post.likes.length });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.post('/:postId/comment', validateIds, uploadFields, async (req, res) => {
    const currentUser = req.user || req.session.user;
    if (!currentUser) return res.status(401).json({ success: false });

    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.json({ success: false });

        const userId = (currentUser._id || currentUser.id).toString();
        const comment = {
            user: userId,
            text: req.body.commentText || '',
            image: req.files?.commentImage ? `/uploads/${req.files.commentImage[0].filename}` : '',
            video: req.files?.commentVideo ? `/uploads/${req.files.commentVideo[0].filename}` : ''
        };

        post.comments.push(comment);
        await post.save();

        if (post.author.toString() !== userId) {
            await Notification.create({
                recipient: post.author,
                sender: userId,
                post: post._id,
                type: 'comment'
            });
        }

        res.json({
            success: true,
            text: comment.text,
            image: comment.image,
            video: comment.video,
            commentsCount: post.comments.length,
            author: { firstName: currentUser.firstName, lastName: currentUser.lastName }
        });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.post('/:postId/share', validateIds, async (req, res) => {
    const user = req.user || req.session.user;
    if (!user) return res.status(401).json({ success: false });

    try {
        const originalPost = await Post.findById(req.params.postId);
        if (!originalPost) return res.json({ success: false, message: "Post introuvable" });

        const userId = (user._id || user.id).toString();

        const newPost = new Post({
            author: userId,
            sharedPost: originalPost._id,
            sharedText: req.body.sharedText || ''
        });

        await newPost.save();

        if (originalPost.author.toString() !== userId) {
            await Notification.create({
                recipient: originalPost.author,
                sender: userId,
                post: originalPost._id,
                type: 'share'
            });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ❤️ LIKE / UNLIKE COMMENT
router.post('/:postId/comment/:commentId/like', validateIds, async (req, res) => {
    const user = req.user || req.session.user;
    if (!user) return res.status(401).json({ success: false });

    try {
        const post = await Post.findById(req.params.postId);
        const comment = post?.comments.id(req.params.commentId);
        if (!comment) return res.json({ success: false });

        const userId = (user._id || user.id).toString();
        const index = comment.likes.findIndex(id => id.toString() === userId);

        let action = index !== -1 ? 'unliked' : 'liked';
        if (index !== -1) comment.likes.splice(index, 1);
        else comment.likes.push(userId);

        await post.save();
        res.json({ success: true, action, likesCount: comment.likes.length });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ❤️ LIKE / UNLIKE REPLY (Fixed path)
router.post('/:postId/comment/:commentId/reply/:replyId/like', validateIds, async (req, res) => {
    const user = req.user || req.session.user;
    if (!user) return res.status(401).json({ success: false });

    try {
        const post = await Post.findById(req.params.postId);
        const comment = post?.comments.id(req.params.commentId);
        const reply = comment?.replies.id(req.params.replyId);
        if (!reply) return res.status(404).json({ success: false });

        const userId = (user._id || user.id).toString();
        const index = reply.likes.findIndex(id => id.toString() === userId);

        if (index === -1) reply.likes.push(userId);
        else reply.likes.splice(index, 1);

        await post.save();
        res.json({ success: true, likesCount: reply.likes.length });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Partager un post via la messagerie privée
// Remove the extra '/post' from the path
// --- Inside postRoutes.js ---

router.post('/send-to-user', async (req, res) => {
    const user = req.user || req.session.user;
    if (!user) return res.status(401).json({ success: false });

    const { postId, receiverId } = req.body; // <--- This must match the key sent from main.js
    const senderId = (user._id || user.id).toString();

    // 1. Validation check to prevent crashes
    if (!receiverId) {
        return res.status(400).json({ success: false, message: "Receiver ID is missing" });
    }

    try {
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        });

        if (!conversation) {
            conversation = new Conversation({
                participants: [senderId, receiverId],
                lastMessage: "Post partagé"
            });
            await conversation.save();
        }

        // 2. CREATE MESSAGE (Fixed receiver assignment)
        const newMessage = new Message({
            conversationId: conversation._id,
            sender: senderId,
            receiver: receiverId, // <--- MAKE SURE THIS LINE EXISTS AND USES receiverId
            content: "A partagé un post avec vous",
            sharedPost: postId,
            isRead: false
        });

        await newMessage.save(); // This is where it was failing because receiver was undefined

        // 3. Update conversation timestamp
        await Conversation.findByIdAndUpdate(conversation._id, {
            lastMessage: "Post partagé",
            updatedAt: Date.now()
        });

        res.json({ success: true, conversationId: conversation._id });

    } catch (err) {
        console.error("Detailed Error:", err); // Keep this for debugging
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE, EDIT, etc. (Remain similar but should use validateIds)
router.delete('/:postId', validateIds, async (req, res) => { /* logic */ });

module.exports = router;