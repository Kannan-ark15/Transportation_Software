const express = require('express');
const router = express.Router();

const {
    getGstInvoiceMeta,
    getGstInvoicePeriodSummary,
    getAllGstInvoices,
    getGstInvoiceById,
    createGstInvoice,
    updateGstInvoiceFilingStatus,
    deleteGstInvoice
} = require('../controllers/gstInvoiceController');

router.get('/meta', getGstInvoiceMeta);
router.get('/period-summary', getGstInvoicePeriodSummary);
router.get('/', getAllGstInvoices);
router.get('/:id', getGstInvoiceById);
router.post('/', createGstInvoice);
router.patch('/:id/filing-status', updateGstInvoiceFilingStatus);
router.delete('/:id', deleteGstInvoice);

module.exports = router;
