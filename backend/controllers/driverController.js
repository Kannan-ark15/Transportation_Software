const DriverModel = require('../models/driverModel');

class DriverController {
    static async createDriver(req, res) {
        try {
            const driverData = req.body;

            if (await DriverModel.existsByContact(driverData.primary_contact_no)) {
                return res.status(400).json({ success: false, message: 'Contact number already exists' });
            }
            if (await DriverModel.existsByLicense(driverData.license_no)) {
                return res.status(400).json({ success: false, message: 'License number already exists' });
            }
            if (await DriverModel.existsByAadhar(driverData.aadhar_no)) {
                return res.status(400).json({ success: false, message: 'Aadhar number already exists' });
            }

            const newDriver = await DriverModel.create(driverData);
            res.status(201).json({ success: true, message: 'Driver created successfully', data: newDriver });
        } catch (error) {
            console.error('Error creating driver:', error);
            res.status(500).json({ success: false, message: 'Error creating driver', error: error.message });
        }
    }

    static async getAllDrivers(req, res) {
        try {
            const drivers = await DriverModel.findAll();
            res.status(200).json({ success: true, count: drivers.length, data: drivers });
        } catch (error) {
            console.error('Error fetching drivers:', error);
            res.status(500).json({ success: false, message: 'Error fetching drivers', error: error.message });
        }
    }

    static async getDriverById(req, res) {
        try {
            const { id } = req.params;
            const driver = await DriverModel.findById(id);
            if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
            res.status(200).json({ success: true, data: driver });
        } catch (error) {
            console.error('Error fetching driver:', error);
            res.status(500).json({ success: false, message: 'Error fetching driver', error: error.message });
        }
    }

    static async updateDriver(req, res) {
        try {
            const { id } = req.params;
            const driverData = req.body;

            if (await DriverModel.existsByContact(driverData.primary_contact_no, id)) {
                return res.status(400).json({ success: false, message: 'Contact number already exists' });
            }
            if (await DriverModel.existsByLicense(driverData.license_no, id)) {
                return res.status(400).json({ success: false, message: 'License number already exists' });
            }
            if (await DriverModel.existsByAadhar(driverData.aadhar_no, id)) {
                return res.status(400).json({ success: false, message: 'Aadhar number already exists' });
            }

            const updatedDriver = await DriverModel.update(id, driverData);
            res.status(200).json({ success: true, message: 'Driver updated successfully', data: updatedDriver });
        } catch (error) {
            console.error('Error updating driver:', error);
            res.status(500).json({ success: false, message: 'Error updating driver', error: error.message });
        }
    }

    static async deleteDriver(req, res) {
        try {
            const { id } = req.params;
            await DriverModel.delete(id);
            res.status(200).json({ success: true, message: 'Driver deleted successfully' });
        } catch (error) {
            console.error('Error deleting driver:', error);
            res.status(500).json({ success: false, message: 'Error deleting driver', error: error.message });
        }
    }
}

module.exports = DriverController;
