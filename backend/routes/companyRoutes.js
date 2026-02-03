const express = require('express');
const router = express.Router();
const CompanyController = require('../controllers/companyController');
const { companyValidationRules, validate } = require('../utils/validators');

// Create a new company
router.post(
    '/',
    companyValidationRules(),
    validate,
    CompanyController.createCompany
);

// Get all companies
router.get('/', CompanyController.getAllCompanies);

// Get company by ID
router.get('/:id', CompanyController.getCompanyById);

// Update company
router.put(
    '/:id',
    companyValidationRules(),
    validate,
    CompanyController.updateCompany
);

// Delete company
router.delete('/:id', CompanyController.deleteCompany);

module.exports = router;
