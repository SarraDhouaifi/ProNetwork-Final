const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// ---------------------------------------------------------
// 1. INSCRIPTION UTILISATEUR (Individu)
// ---------------------------------------------------------
exports.registerUser = async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            // Si c'est une requête AJAX, on renvoie du JSON, sinon on rend la vue avec l'erreur
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ message: 'This email is already registered.' });
            }
            return res.render('auth/register-user', { error: 'This email is already registered.' });
        }

        user = new User({
            firstName,
            lastName: lastName || '',
            email,
            password,
            role: 'user',
            headline: 'New Member at ProNetwork'
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Stockage en session pour l'authentification persistante
        req.session.user = {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: 'user',
            headline: user.headline
        };

        req.session.save((err) => {
            if (err) {
                return res.status(500).json({ message: "Session save error" });
            }
            // On force le retour JSON pour le fetch
            return res.status(201).json({ 
                success: true, 
                message: 'Registered successfully!', 
                redirectUrl: '/onboarding' // Tu voulais aller vers onboarding non ?
            });
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).render('auth/register-user', { error: 'Server error during registration.' });
    }
};

// ---------------------------------------------------------
// 2. CONNEXION (Login)
// ---------------------------------------------------------
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const foundUser = await User.findOne({ email }); // On utilise foundUser pour éviter les conflits
        
        if (!foundUser) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // 1. VÉRIFICATION DU BANNISSEMENT
        if (foundUser.isBanned) {
            return res.status(403).json({ 
                message: "Votre compte a été suspendu par l'administrateur." 
            });
        }

        // 2. VÉRIFICATION MOT DE PASSE
        const isMatch = await bcrypt.compare(password, foundUser.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // 3. STOCKAGE EN SESSION
        req.session.user = {
            _id: foundUser._id,
            firstName: foundUser.firstName,
            lastName: foundUser.lastName || '',
            companyName: foundUser.companyName || '',
            email: foundUser.email,
            role: foundUser.role,
            headline: foundUser.headline || 'Welcome back!'
        };

        // 4. SAUVEGARDE DE LA SESSION ET RÉPONSE
        req.session.save((err) => {
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).json({ message: "Internal server error during session save." });
            }

            // Déterminer l'URL cible
            let targetUrl = '/feed';
            if (foundUser.role === 'admin') {
                targetUrl = '/admin/dashboard';
            }

            // Réponse JSON pour le fetch de login.js
            return res.status(200).json({ 
                message: 'Login successful!', 
                redirectUrl: targetUrl 
            });
        });

    } catch (error) {
        console.error('Login error:', error);
        // On vérifie si les headers n'ont pas déjà été envoyés avant de renvoyer une erreur
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error. Please try again.' });
        }
    }
};

// ---------------------------------------------------------
// 3. MOT DE PASSE OUBLIÉ
// ---------------------------------------------------------
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Email not found' });
        }

        const newPassword = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset - ProNetwork',
            text: `Your new password is: ${newPassword}\nPlease log in and change it immediately.`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'New password sent to your email!' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Error sending email' });
    }
};

// ---------------------------------------------------------
// 4. INSCRIPTION ENTREPRISE
// ---------------------------------------------------------
exports.registerCompany = async (req, res) => {
    const { companyName, email, password, website, location } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.render('auth/register-company', { error: 'This email is already registered.' });
        }

        user = new User({
            firstName: companyName, // On garde firstName pour la compatibilité
            companyName: companyName,
            lastName: '.', 
            email,
            password,
            role: 'company',
            location: location || '',
            contactInfo: { website: website || '' },
            headline: `Recrutement chez ${companyName}`
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        req.session.user = {
            _id: user._id,
            firstName: user.firstName,
            email: user.email,
            role: 'company',
            headline: user.headline
        };

        req.session.save((err) => {
            if (err) return res.status(500).json({ message: "Session error" });
            
            return res.status(201).json({ 
                success: true, 
                message: 'Company account created!', 
                redirectUrl: '/feed' 
            });
        });

    } catch (error) {
        console.error('Company registration error:', error);
        res.status(500).render('auth/register-company', { error: 'Server error during registration.' });
    }
};