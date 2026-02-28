const express = require('express');
const router = express.Router();
const {
    getEligibleOwners,
    getReadyVouchers,
    getAllSettlements,
    createSettlement
} = require('../controllers/dedicatedMarketSettlementController');

router.get('/owners', getEligibleOwners);
router.get('/ready-vouchers', getReadyVouchers);
router.get('/', getAllSettlements);
router.post('/', createSettlement);

module.exports = router;

