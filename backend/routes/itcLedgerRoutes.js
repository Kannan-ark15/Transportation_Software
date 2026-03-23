const express = require('express');
const router = express.Router();

const {
    getItcLedgerMeta,
    getAllItcLedgerEntries,
    getItcLedgerEntryById,
    createItcLedgerEntry,
    updateItcLedgerEntry,
    deleteItcLedgerEntry
} = require('../controllers/itcLedgerController');

router.get('/meta', getItcLedgerMeta);
router.get('/', getAllItcLedgerEntries);
router.get('/:id', getItcLedgerEntryById);
router.post('/', createItcLedgerEntry);
router.put('/:id', updateItcLedgerEntry);
router.delete('/:id', deleteItcLedgerEntry);

module.exports = router;
