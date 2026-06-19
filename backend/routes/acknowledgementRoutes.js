const express = require('express');
const router = express.Router();
const {
    getAllAcknowledgements,
    getAcknowledgementById,
    createAcknowledgement,
    updateAcknowledgement
} = require('../controllers/acknowledgementController');

router.get('/', getAllAcknowledgements);
router.get('/:id', getAcknowledgementById);
router.post('/', createAcknowledgement);
router.put('/:id', updateAcknowledgement);

module.exports = router;