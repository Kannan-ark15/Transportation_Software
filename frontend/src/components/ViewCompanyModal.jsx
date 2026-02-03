import React from 'react';
import Modal from './Modal';

const ViewCompanyModal = ({ isOpen, onClose, company }) => {
    if (!company) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Company Details"
            footer={
                <button className="btn btn-secondary" onClick={onClose}>
                    Close
                </button>
            }
        >
            <div className="detail-grid">
                <div className="detail-item">
                    <div className="detail-label">Company Name</div>
                    <div className="detail-value">{company.company_name}</div>
                </div>

                <div className="detail-item">
                    <div className="detail-label">Place</div>
                    <div className="detail-value">{company.place}</div>
                </div>

                <div className="detail-item">
                    <div className="detail-label">GST Number</div>
                    <div className="detail-value">{company.gst_no}</div>
                </div>

                <div className="detail-item">
                    <div className="detail-label">PIN Code</div>
                    <div className="detail-value">{company.pin_code}</div>
                </div>

                <div className="detail-item">
                    <div className="detail-label">Contact Number</div>
                    <div className="detail-value">{company.contact_no}</div>
                </div>

                <div className="detail-item">
                    <div className="detail-label">Email</div>
                    <div className="detail-value">{company.email_id}</div>
                </div>
            </div>

            <div style={{ marginTop: '24px' }}>
                <div className="detail-item">
                    <div className="detail-label">Address Line 1</div>
                    <div className="detail-value">{company.company_address_1}</div>
                </div>

                <div className="detail-item">
                    <div className="detail-label">Address Line 2</div>
                    <div className="detail-value">{company.company_address_2 || '-'}</div>
                </div>
            </div>

            <div className="detail-grid" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                <div className="detail-item">
                    <div className="detail-label">Created At</div>
                    <div className="detail-value">{formatDate(company.created_at)}</div>
                </div>

                <div className="detail-item">
                    <div className="detail-label">Last Updated</div>
                    <div className="detail-value">{formatDate(company.updated_at)}</div>
                </div>
            </div>
        </Modal>
    );
};

export default ViewCompanyModal;
