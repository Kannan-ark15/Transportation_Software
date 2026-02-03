import React, { useState } from 'react';
import Modal from './Modal';
import { companyAPI } from '../services/api';

const AddCompanyModal = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        company_name: '',
        place: '',
        company_address_1: '',
        company_address_2: '',
        gst_no: '',
        pin_code: '',
        contact_no: '',
        email_id: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.company_name.trim()) {
            newErrors.company_name = 'Company name is required';
        }

        if (!formData.place.trim()) {
            newErrors.place = 'Place is required';
        }

        if (!formData.company_address_1.trim()) {
            newErrors.company_address_1 = 'Address is required';
        }

        if (!formData.gst_no.trim()) {
            newErrors.gst_no = 'GST number is required';
        } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_no)) {
            newErrors.gst_no = 'Invalid GST number format';
        }

        if (!formData.pin_code.trim()) {
            newErrors.pin_code = 'PIN code is required';
        } else if (!/^[0-9]{6}$/.test(formData.pin_code)) {
            newErrors.pin_code = 'PIN code must be 6 digits';
        }

        if (!formData.contact_no.trim()) {
            newErrors.contact_no = 'Contact number is required';
        } else if (!/^[0-9]{10}$/.test(formData.contact_no)) {
            newErrors.contact_no = 'Contact number must be 10 digits';
        }

        if (!formData.email_id.trim()) {
            newErrors.email_id = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_id)) {
            newErrors.email_id = 'Invalid email format';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        try {
            setLoading(true);
            setError('');
            const response = await companyAPI.create(formData);

            if (response.success) {
                // Reset form
                setFormData({
                    company_name: '',
                    place: '',
                    company_address_1: '',
                    company_address_2: '',
                    gst_no: '',
                    pin_code: '',
                    contact_no: '',
                    email_id: ''
                });
                onSuccess();
                onClose();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create company. Please try again.');
            console.error('Error creating company:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Company"
            footer={
                <>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Creating...' : 'Create Company'}
                    </button>
                </>
            }
        >
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label required">Company Name</label>
                        <input
                            type="text"
                            name="company_name"
                            className={`form-control ${errors.company_name ? 'error' : ''}`}
                            value={formData.company_name}
                            onChange={handleChange}
                            placeholder="Enter company name"
                        />
                        {errors.company_name && <div className="form-error">{errors.company_name}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label required">Place</label>
                        <input
                            type="text"
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
                    <label className="form-label required">Address Line 1</label>
                    <input
                        type="text"
                        name="company_address_1"
                        className={`form-control ${errors.company_address_1 ? 'error' : ''}`}
                        value={formData.company_address_1}
                        onChange={handleChange}
                        placeholder="Enter address line 1"
                    />
                    {errors.company_address_1 && <div className="form-error">{errors.company_address_1}</div>}
                </div>

                <div className="form-group">
                    <label className="form-label">Address Line 2</label>
                    <input
                        type="text"
                        name="company_address_2"
                        className="form-control"
                        value={formData.company_address_2}
                        onChange={handleChange}
                        placeholder="Enter address line 2 (optional)"
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label required">GST Number</label>
                        <input
                            type="text"
                            name="gst_no"
                            className={`form-control ${errors.gst_no ? 'error' : ''}`}
                            value={formData.gst_no}
                            onChange={handleChange}
                            maxLength={15}
                            placeholder="22AAAAA0000A1Z5"
                        />
                        {errors.gst_no && <div className="form-error">{errors.gst_no}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label required">PIN Code</label>
                        <input
                            type="text"
                            name="pin_code"
                            className={`form-control ${errors.pin_code ? 'error' : ''}`}
                            value={formData.pin_code}
                            onChange={handleChange}
                            maxLength={6}
                            placeholder="123456"
                        />
                        {errors.pin_code && <div className="form-error">{errors.pin_code}</div>}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label required">Contact Number</label>
                        <input
                            type="tel"
                            name="contact_no"
                            className={`form-control ${errors.contact_no ? 'error' : ''}`}
                            value={formData.contact_no}
                            onChange={handleChange}
                            maxLength={10}
                            placeholder="9876543210"
                        />
                        {errors.contact_no && <div className="form-error">{errors.contact_no}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label required">Email</label>
                        <input
                            type="email"
                            name="email_id"
                            className={`form-control ${errors.email_id ? 'error' : ''}`}
                            value={formData.email_id}
                            onChange={handleChange}
                            placeholder="company@example.com"
                        />
                        {errors.email_id && <div className="form-error">{errors.email_id}</div>}
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default AddCompanyModal;
