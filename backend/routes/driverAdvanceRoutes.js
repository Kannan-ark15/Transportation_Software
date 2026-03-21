const express = require('express');
const router = express.Router();
const {
    getDriverAdvanceMeta,
    getAllDriverAdvances,
    getDriverAdvanceById,
    createDriverAdvance
} = require('../controllers/driverAdvanceController');

router.get('/meta', getDriverAdvanceMeta);
router.get('/', getAllDriverAdvances);
router.get('/:id', getDriverAdvanceById);
router.post('/', createDriverAdvance);

module.exports = router;
