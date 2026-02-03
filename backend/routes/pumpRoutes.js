const express = require('express');
const router = express.Router();
const PumpController = require('../controllers/pumpController');

router.post('/', PumpController.createPump);
router.get('/', PumpController.getAllPumps);
router.get('/:id', PumpController.getPumpById);
router.put('/:id', PumpController.updatePump);
router.delete('/:id', PumpController.deletePump);

module.exports = router;
