const express = require('express');
const router = express.Router();
const {
    getEligibleDrivers,
    getReadyVouchers,
    getAllSettlements,
    createSettlement
} = require('../controllers/ownVehicleSettlementController');

router.get('/drivers', getEligibleDrivers);
router.get('/ready-vouchers', getReadyVouchers);
router.get('/', getAllSettlements);
router.post('/', createSettlement);

module.exports = router;

