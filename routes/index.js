const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// ---------------------------------------------------------
// 1. RACINE (Root)
// ---------------------------------------------------------
router.get('/', (req, res) => {
    // Vérification hybride : Passport (isAuthenticated) OU Session personnalisée
    if (req.isAuthenticated() || req.session.user) {
        res.redirect('/feed');
    } else {
        res.redirect('/login');
    }
});

// ---------------------------------------------------------
// 2. CONNEXION (Login)
// ---------------------------------------------------------
router.get('/login', (req, res) => {
    if (req.isAuthenticated() || req.session.user) {
        return res.redirect('/feed');
    }
    // Utilisation du sous-dossier 'auth/' pour la clarté
    res.render('auth/login');
});

router.post('/login', authController.loginUser);

// ---------------------------------------------------------
// 3. FLUX D'INSCRIPTION (Registration)
// ---------------------------------------------------------

// Page de sélection : Choix entre User et Company
router.get('/register', (req, res) => {
    if (req.isAuthenticated() || req.session.user) {
        return res.redirect('/feed');
    }
    res.render('auth/select-role');
});

// Inscription Candidat (User)
router.get('/register/user', (req, res) => {
    if (req.isAuthenticated() || req.session.user) {
        return res.redirect('/feed');
    }
    res.render('auth/register-user');
});
router.post('/register/user', authController.registerUser);

// Inscription Entreprise (Company)
router.get('/register/company', (req, res) => {
    if (req.isAuthenticated() || req.session.user) {
        return res.redirect('/feed');
    }
    res.render('auth/register-company');
});
router.post('/register/company', authController.registerCompany);

// ---------------------------------------------------------
// 4. MOT DE PASSE OUBLIÉ
// ---------------------------------------------------------
router.get('/forgot-password', (req, res) => {
    res.render('auth/forgot-password');
});

router.post('/forgot-password', authController.forgotPassword);

// ---------------------------------------------------------
// 5. DÉCONNEXION (Logout)
// ---------------------------------------------------------
router.get('/logout', (req, res, next) => {
    // 1. Déconnexion via Passport
    req.logout((err) => {
        if (err) {
            console.error("Erreur Passport Logout:", err);
            return next(err);
        }
        // 2. Destruction de la session Express
        req.session.destroy((err) => {
            if (err) console.error("Erreur destruction session:", err);
            // 3. Nettoyage et redirection
            res.clearCookie('connect.sid');
            res.redirect('/login');
        });
    });
});

module.exports = router;