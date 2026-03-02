const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const {
    getLoanMasterMeta,
    getAllLoanMasters,
    getLoanMasterById,
    createLoanMaster,
    updateLoanMaster,
    deleteLoanMaster,
    parseLoanPDF
} = require('../controllers/loanMasterController');

router.get('/meta', getLoanMasterMeta);
router.get('/', getAllLoanMasters);
router.get('/:id', getLoanMasterById);
router.post('/', createLoanMaster);
router.post('/parse-pdf', upload.single('pdf'), parseLoanPDF);
router.put('/:id', updateLoanMaster);
router.delete('/:id', deleteLoanMaster);

module.exports = router;

