const express = require('express');
const router = express.Router();
const { getAllRateCards, getRateCardById, createRateCard, updateRateCard, deleteRateCard } = require('../controllers/rateCardController');

router.get('/', getAllRateCards);
router.get('/:id', getRateCardById);
router.post('/', createRateCard);
router.put('/:id', updateRateCard);
router.delete('/:id', deleteRateCard);

module.exports = router;
