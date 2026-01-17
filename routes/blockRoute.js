const express = require('express');
const router = express.Router();
const Block = require('../models/Block');
const Connection = require('../models/Connection');

router.post('/block/:userId', async (req, res) => {
    const currentUser = req.user || req.session.user;
    if (!currentUser) return res.status(401).json({ success: false });

    const blocker = currentUser._id;
    const blocked = req.params.userId;

    await Connection.findOneAndDelete({
        $or: [
            { sender: blocker, receiver: blocked },
            { sender: blocked, receiver: blocker }
        ]
    });

    await Block.findOneAndUpdate(
        { blocker, blocked },
        { blocker, blocked },
        { upsert: true }
    );

    res.json({ success: true });
});

router.post('/unblock-user', async (req, res) => {  // ← Removed '/api'
    const currentUser = req.user || req.session.user;
    if (!currentUser) return res.status(401).json({ success: false });

    const { userId } = req.body;

    try {
        await Block.deleteOne({
            blocker: currentUser._id,
            blocked: userId
        });

        const io = req.app.get('io');
        if (io) io.emit('block-list-updated');

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;