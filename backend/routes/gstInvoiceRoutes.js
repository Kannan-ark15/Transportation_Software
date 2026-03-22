const express = require('express');
const router = express.Router();

const {
    getGstInvoiceMeta,
    getAllGstInvoices,
    getGstInvoiceById,
    createGstInvoice,
    updateGstInvoiceFilingStatus,
    deleteGstInvoice
} = require('../controllers/gstInvoiceController');

router.get('/meta', getGstInvoiceMeta);
router.get('/', getAllGstInvoices);
router.get('/:id', getGstInvoiceById);
router.post('/', createGstInvoice);
router.patch('/:id/filing-status', updateGstInvoiceFilingStatus);
router.delete('/:id', deleteGstInvoice);

module.exports = router;
