const express = require('express');
const router = express.Router();
const PlaceController = require('../controllers/placeController');

router.post('/', PlaceController.createPlace);
router.get('/', PlaceController.getAllPlaces);
router.get('/:id', PlaceController.getPlaceById);
router.put('/:id', PlaceController.updatePlace);
router.delete('/:id', PlaceController.deletePlace);

module.exports = router;
