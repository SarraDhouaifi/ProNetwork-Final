// controllers/jobController.js
exports.applyToJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.user._id;

        const job = await Job.findById(jobId);
        
        // Vérifier si l'utilisateur a déjà postulé
        if (job.applicants.includes(userId)) {
            return res.status(400).send("Vous avez déjà postulé à cette offre.");
        }

        // Ajouter l'ID de l'utilisateur à la liste des candidats
        job.applicants.push(userId);
        await job.save();

        res.redirect('/jobs/' + jobId + '?success=true');
    } catch (error) {
        res.status(500).send("Erreur lors de la candidature");
    }
};