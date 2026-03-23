const express = require('express');
const router = express.Router();

const {
    getPurchaseGstTrackerMeta,
    getAllPurchaseGstEntries,
    getPurchaseGstEntryById,
    createPurchaseGstEntry,
    updatePurchaseGstEntry,
    deletePurchaseGstEntry
} = require('../controllers/purchaseGstTrackerController');

router.get('/meta', getPurchaseGstTrackerMeta);
router.get('/', getAllPurchaseGstEntries);
router.get('/:id', getPurchaseGstEntryById);
router.post('/', createPurchaseGstEntry);
router.put('/:id', updatePurchaseGstEntry);
router.delete('/:id', deletePurchaseGstEntry);

module.exports = router;
