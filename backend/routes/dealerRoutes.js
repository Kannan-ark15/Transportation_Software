const express = require('express');
const router = express.Router();
const DealerController = require('../controllers/dealerController');

router.post('/', DealerController.createDealer);
router.get('/', DealerController.getAllDealers);
router.get('/:id', DealerController.getDealerById);
router.put('/:id', DealerController.updateDealer);
router.delete('/:id', DealerController.deleteDealer);

module.exports = router;
