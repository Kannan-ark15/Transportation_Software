import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { companyAPI } from '../services/api';

const CompanyList = () => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteSuccess, setDeleteSuccess] = useState('');

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

    if (loading) {
        return <div className="loading">Loading companies...</div>;
    }

    return (
        <div className="container">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Company Master</h2>
                    <Link to="/add" className="btn btn-primary">
                        Add New Company
                    </Link>
                </div>

                {error && <div className="error-message">{error}</div>}
                {deleteSuccess && <div className="success-message">{deleteSuccess}</div>}

                {companies.length === 0 ? (
                    <div className="empty-state">
                        <h3>No Companies Found</h3>
                        <p>Get started by adding your first company.</p>
                        <Link to="/add" className="btn btn-primary" style={{ marginTop: '20px' }}>
                            Add New Company
                        </Link>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Company Name</th>
                                    <th>Place</th>
                                    <th>GST No</th>
                                    <th>Contact No</th>
                                    <th>Email</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {companies.map((company) => (
                                    <tr key={company.id}>
                                        <td>{company.company_name}</td>
                                        <td>{company.place}</td>
                                        <td>{company.gst_no}</td>
                                        <td>{company.contact_no}</td>
                                        <td>{company.email_id}</td>
                                        <td>
                                            <div className="table-actions">
                                                <Link
                                                    to={`/edit/${company.id}`}
                                                    className="btn btn-primary btn-sm"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(company.id, company.company_name)}
                                                    className="btn btn-danger btn-sm"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanyList;
