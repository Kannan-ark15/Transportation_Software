import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { companyAPI } from '../services/api';
import { validateCompanyForm } from '../utils/validation';

const CompanyForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        company_name: '',
        company_address_1: '',
        company_address_2: '',
        place: '',
        gst_no: '',
        pin_code: '',
        contact_no: '',
        email_id: '',
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState('');

    // Load company data if in edit mode
    useEffect(() => {
        if (isEditMode) {
            loadCompanyData();
        }
    }, [id]);

    const loadCompanyData = async () => {
        try {
            setLoading(true);
            const response = await companyAPI.getById(id);
            if (response.success) {
                setFormData(response.data);
            }
        } catch (error) {
            setSubmitError('Failed to load company data');
            console.error('Error loading company:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: '',
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');
        setSubmitSuccess('');

        // Validate form
        const validationErrors = validateCompanyForm(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        try {
            setLoading(true);
            let response;

            if (isEditMode) {
                response = await companyAPI.update(id, formData);
            } else {
                response = await companyAPI.create(formData);
            }

            if (response.success) {
                setSubmitSuccess(
                    isEditMode ? 'Company updated successfully!' : 'Company created successfully!'
                );
                setTimeout(() => {
                    navigate('/');
                }, 1500);
            }
        } catch (error) {
            if (error.response?.data?.message) {
                setSubmitError(error.response.data.message);
            } else if (error.response?.data?.errors) {
                // Handle validation errors from backend
                const backendErrors = {};
                error.response.data.errors.forEach((err) => {
                    backendErrors[err.field] = err.message;
                });
                setErrors(backendErrors);
            } else {
                setSubmitError('An error occurred while saving the company');
            }
            console.error('Error saving company:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate('/');
    };

    if (loading && isEditMode && !formData.company_name) {
        return <div className="loading">Loading company data...</div>;
    }

    return (
        <div className="container">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">
                        {isEditMode ? 'Edit Company' : 'Add New Company'}
                    </h2>
                </div>

                {submitError && <div className="error-message">{submitError}</div>}
                {submitSuccess && <div className="success-message">{submitSuccess}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="company_name" className="form-label required">
                                Company Name
                            </label>
                            <input
                                type="text"
                                id="company_name"
                                name="company_name"
                                className={`form-control ${errors.company_name ? 'error' : ''}`}
                                value={formData.company_name}
                                onChange={handleChange}
                                placeholder="Enter company name"
                            />
                            {errors.company_name && (
                                <div className="form-error">{errors.company_name}</div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="place" className="form-label required">
                                Place
                            </label>
                            <input
                                type="text"
                                id="place"
                                name="place"
                                className={`form-control ${errors.place ? 'error' : ''}`}
                                value={formData.place}
                                onChange={handleChange}
                                placeholder="Enter place"
                            />
                            {errors.place && <div className="form-error">{errors.place}</div>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="company_address_1" className="form-label required">
                            Company Address 1
                        </label>
                        <textarea
                            id="company_address_1"
                            name="company_address_1"
                            className={`form-control ${errors.company_address_1 ? 'error' : ''}`}
                            value={formData.company_address_1}
                            onChange={handleChange}
                            placeholder="Enter company address line 1"
                            rows="3"
                        />
                        {errors.company_address_1 && (
                            <div className="form-error">{errors.company_address_1}</div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="company_address_2" className="form-label">
                            Company Address 2
                        </label>
                        <textarea
                            id="company_address_2"
                            name="company_address_2"
                            className="form-control"
                            value={formData.company_address_2}
                            onChange={handleChange}
                            placeholder="Enter company address line 2 (optional)"
                            rows="3"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="gst_no" className="form-label required">
                                GST Number
                            </label>
                            <input
                                type="text"
                                id="gst_no"
                                name="gst_no"
                                className={`form-control ${errors.gst_no ? 'error' : ''}`}
                                value={formData.gst_no}
                                onChange={handleChange}
                                placeholder="22AAAAA0000A1Z5"
                                maxLength="15"
                            />
                            {errors.gst_no && <div className="form-error">{errors.gst_no}</div>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="pin_code" className="form-label required">
                                PIN Code
                            </label>
                            <input
                                type="text"
                                id="pin_code"
                                name="pin_code"
                                className={`form-control ${errors.pin_code ? 'error' : ''}`}
                                value={formData.pin_code}
                                onChange={handleChange}
                                placeholder="123456"
                                maxLength="6"
                            />
                            {errors.pin_code && <div className="form-error">{errors.pin_code}</div>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="contact_no" className="form-label required">
                                Contact Number
                            </label>
                            <input
                                type="text"
                                id="contact_no"
                                name="contact_no"
                                className={`form-control ${errors.contact_no ? 'error' : ''}`}
                                value={formData.contact_no}
                                onChange={handleChange}
                                placeholder="9876543210"
                                maxLength="10"
                            />
                            {errors.contact_no && (
                                <div className="form-error">{errors.contact_no}</div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="email_id" className="form-label required">
                                Email ID
                            </label>
                            <input
                                type="email"
                                id="email_id"
                                name="email_id"
                                className={`form-control ${errors.email_id ? 'error' : ''}`}
                                value={formData.email_id}
                                onChange={handleChange}
                                placeholder="company@example.com"
                            />
                            {errors.email_id && <div className="form-error">{errors.email_id}</div>}
                        </div>
                    </div>

                    <div className="btn-group">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : isEditMode ? 'Update Company' : 'Create Company'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompanyForm;
