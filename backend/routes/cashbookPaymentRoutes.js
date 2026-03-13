const express = require('express');
const router = express.Router();
const {
    getCashbookMeta,
    getAllPayments,
    getPaymentById,
    createPayment,
    updatePayment,
    deletePayment
} = require('../controllers/cashbookPaymentController');

router.get('/meta', getCashbookMeta);
router.get('/', getAllPayments);
router.get('/:id', getPaymentById);
router.post('/', createPayment);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

module.exports = router;
