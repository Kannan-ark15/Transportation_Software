const express = require('express');
const StationController = require('../controllers/stationController');

const router = express.Router();

router.get('/rates/active', StationController.getActiveRates);
router.get('/:entity', StationController.getAll);
router.post('/:entity', StationController.create);
router.get('/:entity/:id', StationController.getById);
router.put('/:entity/:id', StationController.update);
router.patch('/:entity/:id/status', StationController.updateStatus);
router.delete('/:entity/:id', StationController.delete);

module.exports = router;
