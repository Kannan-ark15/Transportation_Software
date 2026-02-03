const { body, validationResult } = require('express-validator');

// GST Number validation (15 characters: 2 digits + 10 alphanumeric + 1 alphabet + 1 digit + 1 alphabet/digit)
const validateGST = (gst) => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst);
};

// PIN Code validation (6 digits)
const validatePinCode = (pinCode) => {
    const pinRegex = /^[1-9][0-9]{5}$/;
    return pinRegex.test(pinCode);
};

// Contact Number validation (10 digits)
const validateContactNo = (contact) => {
    const contactRegex = /^[6-9][0-9]{9}$/;
    return contactRegex.test(contact);
};

// Email validation
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validation rules for creating a company
const companyValidationRules = () => {
    return [
        body('company_name')
            .trim()
            .notEmpty().withMessage('Company name is required')
            .isLength({ min: 2, max: 255 }).withMessage('Company name must be between 2 and 255 characters'),

        body('company_address_1')
            .trim()
            .notEmpty().withMessage('Company address 1 is required')
            .isLength({ min: 5 }).withMessage('Company address 1 must be at least 5 characters'),

        body('company_address_2')
            .optional({ checkFalsy: true })
            .trim(),

        body('place')
            .trim()
            .notEmpty().withMessage('Place is required')
            .isLength({ min: 2, max: 255 }).withMessage('Place must be between 2 and 255 characters'),

        body('gst_no')
            .trim()
            .notEmpty().withMessage('GST number is required')
            .custom((value) => {
                if (!validateGST(value)) {
                    throw new Error('Invalid GST number format');
                }
                return true;
            }),

        body('pin_code')
            .trim()
            .notEmpty().withMessage('PIN code is required')
            .custom((value) => {
                if (!validatePinCode(value)) {
                    throw new Error('Invalid PIN code format (must be 6 digits)');
                }
                return true;
            }),

        body('contact_no')
            .trim()
            .notEmpty().withMessage('Contact number is required')
            .custom((value) => {
                if (!validateContactNo(value)) {
                    throw new Error('Invalid contact number format (must be 10 digits starting with 6-9)');
                }
                return true;
            }),

        body('email_id')
            .trim()
            .notEmpty().withMessage('Email is required')
            .custom((value) => {
                if (!validateEmail(value)) {
                    throw new Error('Invalid email format');
                }
                return true;
            })
    ];
};

// Middleware to handle validation errors
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

module.exports = {
    companyValidationRules,
    validate,
    validateGST,
    validatePinCode,
    validateContactNo,
    validateEmail
};
