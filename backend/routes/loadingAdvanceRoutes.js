const express = require('express');
const router = express.Router();
const { getAllLoadingAdvances, createLoadingAdvance, getNextVoucher } = require('../controllers/loadingAdvanceController');

router.get('/next-voucher', getNextVoucher);
router.get('/', getAllLoadingAdvances);
router.post('/', createLoadingAdvance);

module.exports = router;
