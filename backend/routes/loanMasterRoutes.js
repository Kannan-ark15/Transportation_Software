const express = require('express');
const router = express.Router();
const {
    getLoanMasterMeta,
    getAllLoanMasters,
    getLoanMasterById,
    createLoanMaster,
    updateLoanMaster,
    deleteLoanMaster
} = require('../controllers/loanMasterController');

router.get('/meta', getLoanMasterMeta);
router.get('/', getAllLoanMasters);
router.get('/:id', getLoanMasterById);
router.post('/', createLoanMaster);
router.put('/:id', updateLoanMaster);
router.delete('/:id', deleteLoanMaster);

module.exports = router;

