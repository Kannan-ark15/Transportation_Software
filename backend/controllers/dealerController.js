const DealerModel = require('../models/dealerModel');

class DealerController {
    static async createDealer(req, res) {
        try {
            const dealerData = req.body;
            const exists = await DealerModel.existsByGST(dealerData.gst_no);
            if (exists) {
                return res.status(400).json({ success: false, message: 'GST number already exists' });
            }
            const newDealer = await DealerModel.create(dealerData);
            res.status(201).json({ success: true, message: 'Dealer created successfully', data: newDealer });
        } catch (error) {
            console.error('Error creating dealer:', error);
            res.status(500).json({ success: false, message: 'Error creating dealer', error: error.message });
        }
    }

    static async getAllDealers(req, res) {
        try {
            const dealers = await DealerModel.findAll();
            res.status(200).json({ success: true, count: dealers.length, data: dealers });
        } catch (error) {
            console.error('Error fetching dealers:', error);
            res.status(500).json({ success: false, message: 'Error fetching dealers', error: error.message });
        }
    }

    static async getDealerById(req, res) {
        try {
            const { id } = req.params;
            const dealer = await DealerModel.findById(id);
            if (!dealer) return res.status(404).json({ success: false, message: 'Dealer not found' });
            res.status(200).json({ success: true, data: dealer });
        } catch (error) {
            console.error('Error fetching dealer:', error);
            res.status(500).json({ success: false, message: 'Error fetching dealer', error: error.message });
        }
    }

    static async updateDealer(req, res) {
        try {
            const { id } = req.params;
            const dealerData = req.body;
            const exists = await DealerModel.existsByGST(dealerData.gst_no, id);
            if (exists) {
                return res.status(400).json({ success: false, message: 'GST number already exists' });
            }
            const updatedDealer = await DealerModel.update(id, dealerData);
            res.status(200).json({ success: true, message: 'Dealer updated successfully', data: updatedDealer });
        } catch (error) {
            console.error('Error updating dealer:', error);
            res.status(500).json({ success: false, message: 'Error updating dealer', error: error.message });
        }
    }

    static async deleteDealer(req, res) {
        try {
            const { id } = req.params;
            await DealerModel.delete(id);
            res.status(200).json({ success: true, message: 'Dealer deleted successfully' });
        } catch (error) {
            console.error('Error deleting dealer:', error);
            res.status(500).json({ success: false, message: 'Error deleting dealer', error: error.message });
        }
    }
}

module.exports = DealerController;
