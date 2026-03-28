const express = require('express');
const router = express.Router();

const { getGstFilingSummary } = require('../controllers/gstFilingController');

router.get('/', getGstFilingSummary);

module.exports = router;
