const PlaceModel = require('../models/placeModel');

class PlaceController {
    static async createPlace(req, res) {
        try {
            const placeData = req.body;
            const exists = await PlaceModel.existsCombination(placeData.to_place, placeData.product_id);
            if (exists) {
                return res.status(400).json({ success: false, message: 'This Place and Product combination already exists' });
            }
            const newPlace = await PlaceModel.create(placeData);
            res.status(201).json({ success: true, message: 'Place created successfully', data: newPlace });
        } catch (error) {
            console.error('Error creating place:', error);
            res.status(500).json({ success: false, message: 'Error creating place', error: error.message });
        }
    }

    static async getAllPlaces(req, res) {
        try {
            const places = await PlaceModel.findAll();
            res.status(200).json({ success: true, count: places.length, data: places });
        } catch (error) {
            console.error('Error fetching places:', error);
            res.status(500).json({ success: false, message: 'Error fetching places', error: error.message });
        }
    }

    static async getPlaceById(req, res) {
        try {
            const { id } = req.params;
            const place = await PlaceModel.findById(id);
            if (!place) return res.status(404).json({ success: false, message: 'Place not found' });
            res.status(200).json({ success: true, data: place });
        } catch (error) {
            console.error('Error fetching place:', error);
            res.status(500).json({ success: false, message: 'Error fetching place', error: error.message });
        }
    }

    static async updatePlace(req, res) {
        try {
            const { id } = req.params;
            const placeData = req.body;
            const exists = await PlaceModel.existsCombination(placeData.to_place, placeData.product_id, id);
            if (exists) {
                return res.status(400).json({ success: false, message: 'This Place and Product combination already exists' });
            }
            const updatedPlace = await PlaceModel.update(id, placeData);
            res.status(200).json({ success: true, message: 'Place updated successfully', data: updatedPlace });
        } catch (error) {
            console.error('Error updating place:', error);
            res.status(500).json({ success: false, message: 'Error updating place', error: error.message });
        }
    }

    static async deletePlace(req, res) {
        try {
            const { id } = req.params;
            await PlaceModel.delete(id);
            res.status(200).json({ success: true, message: 'Place deleted successfully' });
        } catch (error) {
            console.error('Error deleting place:', error);
            res.status(500).json({ success: false, message: 'Error deleting place', error: error.message });
        }
    }
}

module.exports = PlaceController;
