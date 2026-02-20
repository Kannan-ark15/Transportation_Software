const express = require('express');
const router = express.Router();
const { getAllLoadingAdvances, getLoadingAdvanceById, createLoadingAdvance, getNextVoucher, getLoadingAdvanceInvoices } = require('../controllers/loadingAdvanceController');

router.get('/next-voucher', getNextVoucher);
router.get('/:id/invoices', getLoadingAdvanceInvoices);
router.get('/:id', getLoadingAdvanceById);
router.get('/', getAllLoadingAdvances);
router.post('/', createLoadingAdvance);

module.exports = router;
