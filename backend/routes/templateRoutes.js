const express = require('express');
const router = express.Router();

const {
    listTemplates,
    getTemplateColumns
} = require('../controllers/templateController');

// List available templates/masters
router.get('/', listTemplates);

// Get DB columns for a given master (used by frontend to generate Excel headers)
router.get('/:master/columns', getTemplateColumns);

module.exports = router;

