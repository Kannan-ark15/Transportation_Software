// GST Number validation
export const validateGST = (gst) => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst);
};

// PIN Code validation (6 digits)
export const validatePinCode = (pinCode) => {
    const pinRegex = /^[1-9][0-9]{5}$/;
    return pinRegex.test(pinCode);
};

// Contact Number validation (10 digits starting with 6-9)
export const validateContactNo = (contact) => {
    const contactRegex = /^[6-9][0-9]{9}$/;
    return contactRegex.test(contact);
};

// Email validation
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate company form data
export const validateCompanyForm = (formData) => {
    const errors = {};

    // Company Name
    if (!formData.company_name || formData.company_name.trim() === '') {
        errors.company_name = 'Company name is required';
    } else if (formData.company_name.trim().length < 2) {
        errors.company_name = 'Company name must be at least 2 characters';
    }

    // Company Address 1
    if (!formData.company_address_1 || formData.company_address_1.trim() === '') {
        errors.company_address_1 = 'Company address 1 is required';
    } else if (formData.company_address_1.trim().length < 5) {
        errors.company_address_1 = 'Company address 1 must be at least 5 characters';
    }

    // Place
    if (!formData.place || formData.place.trim() === '') {
        errors.place = 'Place is required';
    }

    // GST No
    if (!formData.gst_no || formData.gst_no.trim() === '') {
        errors.gst_no = 'GST number is required';
    } else if (!validateGST(formData.gst_no)) {
        errors.gst_no = 'Invalid GST number format';
    }

    // PIN Code
    if (!formData.pin_code || formData.pin_code.trim() === '') {
        errors.pin_code = 'PIN code is required';
    } else if (!validatePinCode(formData.pin_code)) {
        errors.pin_code = 'Invalid PIN code (must be 6 digits)';
    }

    // Contact No
    if (!formData.contact_no || formData.contact_no.trim() === '') {
        errors.contact_no = 'Contact number is required';
    } else if (!validateContactNo(formData.contact_no)) {
        errors.contact_no = 'Invalid contact number (must be 10 digits starting with 6-9)';
    }

    // Email
    if (!formData.email_id || formData.email_id.trim() === '') {
        errors.email_id = 'Email is required';
    } else if (!validateEmail(formData.email_id)) {
        errors.email_id = 'Invalid email format';
    }

    return errors;
};
