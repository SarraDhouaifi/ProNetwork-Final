const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');

// 1. CONFIGURATIONS & DB
const connectDB = require('./config/db');
const i18n = require('./config/i18n');
dotenv.config();

// Modèles
const User = require('./models/User');
const Notification = require('./models/Notification');
const Connection = require('./models/Connection');

// Initialisations
require('./config/passport')(passport);
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

/**
 * SEED ADMIN
 */
async function seedAdmin() {
    try {
        const adminEmail = 'admin@gmail.com';
        const adminExists = await User.findOne({ email: adminEmail });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin', 10);
            await User.create({
                firstName: 'Admin',
                lastName: 'System',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                headline: 'Platform Administrator'
            });
            console.log('✅ Compte Admin initialisé (admin@gmail.com / admin)');
        }
    } catch (err) {
        console.error('❌ Erreur initialisation Admin:', err);
    }
}
seedAdmin();

// 2. SETTINGS & MIDDLEWARES DE BASE
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('io', io);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public', 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'assets', 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. SESSION & PERSISTANCE
app.use(session({
    secret: process.env.SESSION_SECRET || 'mysecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Passer à true si HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    },
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60
    })
}));

// 4. INTERNATIONALISATION (i18n)
app.use(i18n.init);
app.use((req, res, next) => {
    const lang = req.session.lang || 'en';
    req.setLocale(lang);
    res.locals.t = req.__;
    res.locals.lang = lang;
    next();
});

// 5. PASSPORT (Après session)
app.use(passport.initialize());
app.use(passport.session());

// 6. MIDDLEWARE GLOBAL (User, Notifs, Connections)
app.use(async (req, res, next) => {
    // Unification de l'utilisateur (Passport ou Session manuelle)
    const user = req.user || req.session?.user || null;
    res.locals.user = user;

    if (user) {
        try {
            const userId = (user._id || user.id).toString();
            // Récupération des compteurs en parallèle
            const [unreadCount, connectionsCount] = await Promise.all([
                Notification.countDocuments({ recipient: userId, isRead: false }),
                Connection.countDocuments({
                    $or: [{ sender: userId }, { receiver: userId }],
                    status: 'accepted'
                })
            ]);
            res.locals.unreadCount = unreadCount;
            res.locals.connectionsCount = connectionsCount;
        } catch (err) {
            console.error('Erreur compteurs globaux:', err);
            res.locals.unreadCount = 0;
            res.locals.connectionsCount = 0;
        }
    } else {
        res.locals.unreadCount = 0;
        res.locals.connectionsCount = 0;
    }
    next();
});

// 7. SOCKET.IO LOGIC
io.on('connection', (socket) => {
    socket.on('join', (userId) => {
        if (userId) socket.join(userId);
    });
});

// 8. ROUTES
// Ordre important : spécifiques d'abord, générales ensuite
app.use('/auth', require('./routes/auth'));           // Google Auth
app.use('/post', require('./routes/postRoutes'));     // Gestion des posts (Like/Share/Comment)
app.use('/admin', require('./routes/adminRoutes'));
app.use('/jobs', require('./routes/jobRoutes'));
app.use('/profile', require('./routes/profile'));
app.use('/search', require('./routes/search'));
app.use('/messages', require('./routes/messageRoutes'));
app.use('/notifications', require('./routes/notificationRoutes'));
app.use('/api', require('./routes/blockRoute'));

// Routes racines (Login, Register, Feed)
app.use('/', require('./routes/index'));             // Index (Login/Register standard)
app.use('/', require('./routes/userRoutes'));          // Feed / Core

// Lancement du serveur (Utilise 'server' pour Socket.io)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});