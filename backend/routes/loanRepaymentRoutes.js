const express = require('express');
const router = express.Router();
const {
    getLoanRepaymentMeta,
    getAllLoanRepayments,
    getLoanRepaymentByVehicle,
    updateLoanRepaymentStatus
} = require('../controllers/loanRepaymentController');

router.get('/meta', getLoanRepaymentMeta);
router.get('/vehicle/:vehicleId', getLoanRepaymentByVehicle);
router.put('/:id/status', updateLoanRepaymentStatus);
router.get('/', getAllLoanRepayments);

module.exports = router;
