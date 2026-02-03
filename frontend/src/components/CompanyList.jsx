import React, { useState, useEffect } from 'react';
import { companyAPI } from '../services/api';
import ViewCompanyModal from './ViewCompanyModal';
import EditCompanyModal from './EditCompanyModal';
import AddCompanyModal from './AddCompanyModal';
import Pagination from './Pagination';

const CompanyList = () => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteSuccess, setDeleteSuccess] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Modal state
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);

    useEffect(() => {
        loadCompanies();
    }, []);

    const loadCompanies = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await companyAPI.getAll();
            if (response.success) {
                setCompanies(response.data);
            }
        } catch (err) {
            setError('Failed to load companies. Please try again.');
            console.error('Error loading companies:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, companyName) => {
        if (!window.confirm(`Are you sure you want to delete "${companyName}"?`)) {
            return;
        }

        try {
            const response = await companyAPI.delete(id);
            if (response.success) {
                setDeleteSuccess('Company deleted successfully');
                setCompanies(companies.filter((company) => company.id !== id));
                setTimeout(() => setDeleteSuccess(''), 3000);
            }
        } catch (err) {
            setError('Failed to delete company. Please try again.');
            console.error('Error deleting company:', err);
        }
    };

    const handleView = (company) => {
        setSelectedCompany(company);
        setViewModalOpen(true);
    };

    const handleEdit = (company) => {
        setSelectedCompany(company);
        setEditModalOpen(true);
    };

    const handleSuccess = () => {
        loadCompanies();
        setDeleteSuccess('Operation successful!');
        setTimeout(() => setDeleteSuccess(''), 3000);
    };

    // Calculate pagination
    const totalItems = companies.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedCompanies = companies.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
        return (
            <div className="content-wrapper">
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p>Loading companies...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="content-wrapper">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Company Master</h2>
                    <button
                        className="btn btn-primary"
                        onClick={() => setAddModalOpen(true)}
                    >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Company
                    </button>
                </div>

                {error && <div className="error-message">{error}</div>}
                {deleteSuccess && <div className="success-message">{deleteSuccess}</div>}

                {companies.length === 0 ? (
                    <div className="empty-state">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '64px', height: '64px', marginBottom: '16px', color: 'var(--text-light)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <h3>No Companies Found</h3>
                        <p>Get started by adding your first company.</p>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: '20px' }}
                            onClick={() => setAddModalOpen(true)}
                        >
                            Add New Company
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Company Name</th>
                                        <th>Place</th>
                                        <th>GST No</th>
                                        <th>Contact No</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedCompanies.map((company, index) => (
                                        <tr key={company.id}>
                                            <td>{startIndex + index + 1}</td>
                                            <td style={{ fontWeight: '500' }}>{company.company_name}</td>
                                            <td>{company.place}</td>
                                            <td>
                                                <span style={{
                                                    background: '#f3f4f6',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.85rem',
                                                    fontFamily: 'monospace'
                                                }}>
                                                    {company.gst_no}
                                                </span>
                                            </td>
                                            <td>{company.contact_no}</td>
                                            <td>
                                                <div className="table-actions">
                                                    <button
                                                        onClick={() => handleView(company)}
                                                        className="action-icon view"
                                                        title="View Details"
                                                    >
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(company)}
                                                        className="action-icon edit"
                                                        title="Edit Company"
                                                    >
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(company.id, company.company_name)}
                                                        className="action-icon delete"
                                                        title="Delete Company"
                                                    >
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={(val) => {
                                setItemsPerPage(val);
                                setCurrentPage(1);
                            }}
                        />
                    </>
                )}
            </div>

            {/* Modals */}
            <AddCompanyModal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                onSuccess={handleSuccess}
            />

            <EditCompanyModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                company={selectedCompany}
                onSuccess={handleSuccess}
            />

            <ViewCompanyModal
                isOpen={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                company={selectedCompany}
            />
        </div>
    );
};

export default CompanyList;
