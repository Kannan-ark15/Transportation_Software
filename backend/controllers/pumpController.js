const PumpModel = require('../models/pumpModel');

class PumpController {
    static async createPump(req, res) {
        try {
            const pumpData = req.body;
            const newPump = await PumpModel.create(pumpData);
            res.status(201).json({ success: true, message: 'Pump created successfully', data: newPump });
        } catch (error) {
            console.error('Error creating pump:', error);
            res.status(500).json({ success: false, message: 'Error creating pump', error: error.message });
        }
    }

    static async getAllPumps(req, res) {
        try {
            const pumps = await PumpModel.findAll();
            res.status(200).json({ success: true, count: pumps.length, data: pumps });
        } catch (error) {
            console.error('Error fetching pumps:', error);
            res.status(500).json({ success: false, message: 'Error fetching pumps', error: error.message });
        }
    }

    static async getPumpById(req, res) {
        try {
            const { id } = req.params;
            const pump = await PumpModel.findById(id);
            if (!pump) return res.status(404).json({ success: false, message: 'Pump not found' });
            res.status(200).json({ success: true, data: pump });
        } catch (error) {
            console.error('Error fetching pump:', error);
            res.status(500).json({ success: false, message: 'Error fetching pump', error: error.message });
        }
    }

    static async updatePump(req, res) {
        try {
            const { id } = req.params;
            const pumpData = req.body;
            const updatedPump = await PumpModel.update(id, pumpData);
            res.status(200).json({ success: true, message: 'Pump updated successfully', data: updatedPump });
        } catch (error) {
            console.error('Error updating pump:', error);
            res.status(500).json({ success: false, message: 'Error updating pump', error: error.message });
        }
    }

    static async deletePump(req, res) {
        try {
            const { id } = req.params;
            await PumpModel.delete(id);
            res.status(200).json({ success: true, message: 'Pump deleted successfully' });
        } catch (error) {
            console.error('Error deleting pump:', error);
            res.status(500).json({ success: false, message: 'Error deleting pump', error: error.message });
        }
    }
}

module.exports = PumpController;
