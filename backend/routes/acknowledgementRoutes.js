const express = require('express');
const router = express.Router();
const { getAllAcknowledgements, createAcknowledgement } = require('../controllers/acknowledgementController');

router.get('/', getAllAcknowledgements);
router.post('/', createAcknowledgement);

module.exports = router;
