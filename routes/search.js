// routes/search.js
const express = require('express');
const router = express.Router();

// On importe le fichier qu'on vient de créer au-dessus
const searchController = require('../controllers/searchController');

// On définit la route
router.get('/', searchController.globalSearch);

// On exporte le router pour app.js
module.exports = router;