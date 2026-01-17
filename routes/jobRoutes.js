const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Application = require('../models/Application');

// ============================================================
// FONCTION UTILITAIRE (Gestion Session)
// ============================================================
function getCurrentUser(req) {
    const user = req.user || req.session?.user;
    if (!user) return null;
    if (!user._id && user.id) user._id = user.id;
    return user;
}

// ============================================================
// 1. GESTION DES OFFRES (CRUD - Réservé aux Entreprises)
// ============================================================

// Afficher le formulaire de création
router.get('/create', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');
    try {
        const user = await User.findById(currentUser._id);
        if (user.role !== 'company') return res.redirect('/jobs');
        res.render('jobs/create', { user }); 
    } catch (error) { res.redirect('/feed'); }
});

// Traiter la création de l'offre
router.post('/create', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');
    try {
        const newJob = new Job({
            title: req.body.title,
            location: req.body.location || 'Remote',
            type: req.body.type || 'Full-time',
            description: req.body.description,
            company: currentUser._id
        });
        await newJob.save();
        res.redirect('/jobs/manage'); 
    } catch (error) { res.status(500).send("Erreur lors de la création"); }
});

// Dashboard : Gérer mes offres (Vue Entreprise)
router.get('/manage', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');
    try {
        const jobs = await Job.find({ company: currentUser._id }).sort({ createdAt: -1 });
        res.render('jobs/my_jobs', { user: currentUser, jobs });
    } catch (error) { res.redirect('/feed'); }
});

// Modifier une offre (GET)
router.get('/:id/edit', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');
    try {
        const job = await Job.findById(req.params.id);
        if (!job || job.company.toString() !== currentUser._id.toString()) {
            return res.redirect('/jobs/manage');
        }
        res.render('jobs/edit', { user: currentUser, job });
    } catch (err) { res.redirect('/jobs/manage'); }
});

// Modifier une offre (POST)
router.post('/:id/edit', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');
    try {
        const job = await Job.findById(req.params.id);
        if (job.company.toString() !== currentUser._id.toString()) {
            return res.status(403).send("Non autorisé");
        }
        await Job.findByIdAndUpdate(req.params.id, req.body);
        res.redirect('/jobs/manage');
    } catch (error) { res.status(500).send("Erreur modification"); }
});

// Supprimer une offre
router.post('/:id/delete', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');
    try {
        const job = await Job.findById(req.params.id);
        if (job && job.company.toString() === currentUser._id.toString()) {
            await Job.findByIdAndDelete(req.params.id);
        }
        res.redirect('/jobs/manage');
    } catch (error) { res.status(500).send("Erreur suppression"); }
});

// ============================================================
// 2. CONSULTATION ET CANDIDATURE (Logique Mixte)
// ============================================================

// Route principale /jobs : Redirection intelligente par rôle
router.get('/', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');

    try {
        const userDoc = await User.findById(currentUser._id);

        if (userDoc.role === 'company') {
            // LOGIQUE ENTREPRISE : Voir ses propres offres postées
            const jobs = await Job.find({ company: currentUser._id }).sort({ createdAt: -1 });
            return res.render('jobs/my_jobs', { user: userDoc, jobs });
        } else {
            // LOGIQUE USER : On récupère d'abord ses candidatures
            const myApplications = await Application.find({ applicant: currentUser._id })
                .populate({
                    path: 'job',
                    populate: { path: 'company', select: 'companyName profilePicture' }
                })
                .sort({ createdAt: -1 });

            // On crée un tableau contenant uniquement les IDs des jobs déjà postulés
            const appliedJobIds = myApplications.map(app => app.job._id);

            // On récupère les jobs auxquels l'utilisateur n'a PAS encore postulé
            const allJobs = await Job.find({ 
                    _id: { $nin: appliedJobIds } 
                })
                .populate('company', 'companyName profilePicture firstName lastName')
                .sort({ createdAt: -1 });

            return res.render('jobs/index', { 
                user: userDoc, 
                jobs: allJobs,
                applications: myApplications 
            });
        }
    } catch (error) {
        console.error("Erreur Jobs:", error);
        res.redirect('/feed');
    }
});

// Voir les candidats d'un job (Accès Entreprise uniquement)
router.get('/:jobId/applicants', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');

    try {
        const jobId = req.params.jobId;
        const job = await Job.findById(jobId);

        // Sécurité
        if (!job || job.company.toString() !== currentUser._id.toString()) {
            return res.redirect('/jobs');
        }

        // On va chercher les vraies candidatures dans la collection 'applications'
        const applications = await Application.find({ job: jobId })
            .populate('applicant') // Pour avoir le nom, prénom et photo
            .sort({ createdAt: -1 });

        // On formate les données pour ton fichier EJS
        const applicantsForView = applications.map(app => ({
            _id: app.applicant._id,                // ID pour le lien Profil
            firstName: app.applicant.firstName,
            lastName: app.applicant.lastName,
            profilePicture: app.applicant.profilePicture,
            headline: app.applicant.headline,
            status: app.status,                    // Statut (Acceptée/Refusée)
            applicationId: app._id                 // L'ID CRUCIAL pour tes boutons
        }));

        // On renvoie un objet job enrichi à la vue
        res.render('jobs/applicants-list', { 
            job: { ...job.toObject(), applicants: applicantsForView }, 
            user: currentUser 
        });

    } catch (err) {
        console.error(err);
        res.redirect('/jobs');
    }
});

// Détail d'un job (Public pour tous les connectés)
router.get('/:id', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');
    try {
        const job = await Job.findById(req.params.id)
            .populate('company', 'companyName firstName lastName profilePicture headline location')
            .populate('applicants', 'firstName lastName profilePicture headline'); 
        
        if (!job) return res.status(404).send("Offre introuvable");
        res.render('jobs/show', { user: currentUser, job });
    } catch (error) { res.redirect('/jobs'); }
});

// POSTULER : Création Application + Chat automatique
router.post('/:id/apply', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');

    try {
        const jobId = req.params.id;
        const userId = currentUser._id;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).send("Job not found");
        const companyId = job.company;

        // 1. Enregistrer la candidature (Modèle Application)
        const existingApp = await Application.findOne({ job: jobId, applicant: userId });
        if (!existingApp) {
            const newApp = new Application({
                job: jobId,
                applicant: userId,
                company: companyId
            });
            await newApp.save();
        }

        // 2. Mise à jour du tableau applicants dans le Job
        await Job.findByIdAndUpdate(jobId, { $addToSet: { applicants: userId } });

        // 3. Gestion de la Conversation
        let conversation = await Conversation.findOne({
            participants: { $all: [userId, companyId] }
        });

        if (!conversation) {
            conversation = new Conversation({
                participants: [userId, companyId],
                lastMessage: `Applied for ${job.title}`,
                lastMessageAt: new Date()
            });
            await conversation.save();
        }

        // 4. Envoi du message automatique de candidature
        const messageText = `Bonjour ! Je viens de postuler à l'offre : "${job.title}". Votre opportunité m'intéresse vivement !`;
        const autoMessage = new Message({
            conversationId: conversation._id,
            sender: userId,
            receiver: companyId,
            content: messageText
        });
        await autoMessage.save();

        // Mise à jour de la conversation
        conversation.lastMessage = messageText;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Redirection vers le chat pour confirmer l'action visuellement
        res.redirect(`/messages?conversationId=${conversation._id}`); 
        
    } catch (error) {
        console.error("Apply Error:", error);
        res.status(500).send("Erreur lors de la postulation");
    }
});

router.post('/applications/:appId/status', async (req, res) => {
    const currentUser = getCurrentUser(req);
    if (!currentUser) return res.redirect('/login');

    try {
        const { status } = req.body; // 'Acceptée' ou 'Refusée'
        
        // On cherche l'application
        const application = await Application.findById(req.params.appId);
        if (!application) return res.status(404).send("Candidature introuvable");

        // Sécurité : Vérifier que c'est bien l'entreprise propriétaire du job qui répond
        if (application.company.toString() !== currentUser._id.toString()) {
            return res.status(403).send("Non autorisé");
        }

        application.status = status;
        await application.save();

        // Retour à la liste des candidats du job spécifique
        res.redirect(`/jobs/${application.job}/applicants`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Erreur lors du changement de statut");
    }
});

module.exports = router;