const CompanyModel = require('../models/companyModel');

class CompanyController {
    // Create a new company
    static async createCompany(req, res) {
        try {
            const companyData = req.body;

            // Check for uniqueness constraints
            const nameExists = await CompanyModel.existsByName(companyData.company_name);
            if (nameExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Company name already exists'
                });
            }

            const gstExists = await CompanyModel.existsByGST(companyData.gst_no);
            if (gstExists) {
                return res.status(400).json({
                    success: false,
                    message: 'GST number already exists'
                });
            }

            const contactExists = await CompanyModel.existsByContact(companyData.contact_no);
            if (contactExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Contact number already exists'
                });
            }

            // Create the company
            const newCompany = await CompanyModel.create(companyData);

            res.status(201).json({
                success: true,
                message: 'Company created successfully',
                data: newCompany
            });
        } catch (error) {
            console.error('Error creating company:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating company',
                error: error.message
            });
        }
    }

    // Get all companies
    static async getAllCompanies(req, res) {
        try {
            const companies = await CompanyModel.findAll();

            res.status(200).json({
                success: true,
                count: companies.length,
                data: companies
            });
        } catch (error) {
            console.error('Error fetching companies:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching companies',
                error: error.message
            });
        }
    }

    // Get company by ID
    static async getCompanyById(req, res) {
        try {
            const { id } = req.params;
            const company = await CompanyModel.findById(id);

            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found'
                });
            }

            res.status(200).json({
                success: true,
                data: company
            });
        } catch (error) {
            console.error('Error fetching company:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching company',
                error: error.message
            });
        }
    }

    // Update company
    static async updateCompany(req, res) {
        try {
            const { id } = req.params;
            const companyData = req.body;

            // Check if company exists
            const existingCompany = await CompanyModel.findById(id);
            if (!existingCompany) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found'
                });
            }

            // Check for uniqueness constraints (excluding current company)
            const nameExists = await CompanyModel.existsByName(companyData.company_name, id);
            if (nameExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Company name already exists'
                });
            }

            const gstExists = await CompanyModel.existsByGST(companyData.gst_no, id);
            if (gstExists) {
                return res.status(400).json({
                    success: false,
                    message: 'GST number already exists'
                });
            }

            const contactExists = await CompanyModel.existsByContact(companyData.contact_no, id);
            if (contactExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Contact number already exists'
                });
            }

            // Update the company
            const updatedCompany = await CompanyModel.update(id, companyData);

            res.status(200).json({
                success: true,
                message: 'Company updated successfully',
                data: updatedCompany
            });
        } catch (error) {
            console.error('Error updating company:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating company',
                error: error.message
            });
        }
    }

    // Delete company
    static async deleteCompany(req, res) {
        try {
            const { id } = req.params;

            // Check if company exists
            const existingCompany = await CompanyModel.findById(id);
            if (!existingCompany) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found'
                });
            }

            // Delete the company
            await CompanyModel.delete(id);

            res.status(200).json({
                success: true,
                message: 'Company deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting company:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting company',
                error: error.message
            });
        }
    }
}

module.exports = CompanyController;
