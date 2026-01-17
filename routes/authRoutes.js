const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport');

// Log pour débogage (optionnel)
console.log("Loaded Controller methods:", Object.keys(authController));

// ---------------------------------------------------------
// 1. GOOGLE OAUTH
// ---------------------------------------------------------
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // VERIFICATION BANNISSEMENT (Google)
        if (req.user && req.user.isBanned) {
            req.logout(() => {
                req.session.destroy();
                return res.render('auth/login', { 
                    errorMessage: "Votre compte a été banni par l'administrateur." 
                });
            });
        } else {
            res.redirect('/feed');
        }
    }
);

// ---------------------------------------------------------
// 2. CONNEXION (Login)
// ---------------------------------------------------------
router.get('/login', (req, res) => {
    if (req.user || req.session.user) {
        // Vérification de sécurité même pour les sessions actives
        if (req.user?.isBanned || req.session.user?.isBanned) {
            return res.render('auth/login', { errorMessage: "Ce compte est banni." });
        }
        return res.redirect('/feed');
    }
    // On passe un errorMessage null par défaut pour éviter les erreurs EJS
    res.render('auth/login', { errorMessage: null }); 
});

// Votre contrôleur devra gérer la logique interne du bannissement dans loginUser
router.post('/login', authController.loginUser);

// ---------------------------------------------------------
// 3. MOT DE PASSE OUBLIÉ
// ---------------------------------------------------------
router.get('/forgot-password', (req, res) => {
    res.render('auth/forgot-password');
});

router.post('/forgot-password', authController.forgotPassword);

// ---------------------------------------------------------
// 4. PARCOURS D'INSCRIPTION (Registration)
// ---------------------------------------------------------

// Page de sélection du rôle (User ou Company)
router.get('/register', (req, res) => {
    if (req.user || req.session.user) return res.redirect('/feed');
    res.render('auth/select-role');
});

// Inscription Candidat (User)
router.get('/register/user', (req, res) => {
    if (req.user || req.session.user) return res.redirect('/feed');
    res.render('auth/register-user');
});

router.post('/register/user', authController.registerUser);

// Inscription Entreprise (Company)
router.get('/register/company', (req, res) => {
    if (req.user || req.session.user) return res.redirect('/feed');
    res.render('auth/register-company');
});

router.post('/register/company', authController.registerCompany);

// ---------------------------------------------------------
// 5. DÉCONNEXION (Logout)
// ---------------------------------------------------------
router.get('/logout', (req, res, next) => {
    // On combine les deux approches de déconnexion (Passport + Session manuelle)
    req.logout((err) => {
        if (err) {
            console.error("Logout error:", err);
            return next(err);
        }
        req.session.destroy((err) => {
            if (err) console.log("Session destroy error:", err);
            res.clearCookie('connect.sid'); // Nettoie le cookie de session
            res.redirect('/login');
        });
    });
});

module.exports = router;