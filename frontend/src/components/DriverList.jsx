import React, { useState, useEffect } from 'react';
import { driverAPI } from '../services/api';
import Pagination from './Pagination';
import Modal from './Modal';

const DriverList = () => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [formData, setFormData] = useState({
        driver_name: '', primary_contact_no: '', secondary_contact_no: '', blood_group: 'A+',
        address: '', license_no: '', license_exp_date: '', aadhar_no: '',
        bank_name: '', branch: '', account_number: '', ifsc_code: '', driver_status: true
    });

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'A1+', 'A1-', 'A2+', 'A2-', 'A1B+', 'A1B-', 'A2B+', 'A2B-'];

    useEffect(() => { loadDrivers(); }, []);

    const loadDrivers = async () => {
        try {
            setLoading(true);
            const res = await driverAPI.getAll();
            if (res.success) setDrivers(res.data);
        } catch (err) { setError('Failed to load drivers'); }
        finally { setLoading(false); }
    };

    const handleOpenModal = (mode, driver = null) => {
        setModalMode(mode);
        setSelectedDriver(driver);
        if (driver) {
            setFormData({
                driver_name: driver.driver_name,
                primary_contact_no: driver.primary_contact_no,
                secondary_contact_no: driver.secondary_contact_no || '',
                blood_group: driver.blood_group,
                address: driver.address,
                license_no: driver.license_no,
                license_exp_date: driver.license_exp_date.split('T')[0],
                aadhar_no: driver.aadhar_no,
                bank_name: driver.bank_name,
                branch: driver.branch,
                account_number: driver.account_number,
                ifsc_code: driver.ifsc_code,
                driver_status: driver.driver_status
            });
        } else {
            setFormData({
                driver_name: '', primary_contact_no: '', secondary_contact_no: '', blood_group: 'A+',
                address: '', license_no: '', license_exp_date: '', aadhar_no: '',
                bank_name: '', branch: '', account_number: '', ifsc_code: '', driver_status: true
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (modalMode === 'add') res = await driverAPI.create(formData);
            else res = await driverAPI.update(selectedDriver.id, formData);

            if (res.success) {
                setSuccessMsg(`Driver ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
                setModalOpen(false);
                loadDrivers();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete ${name}?`)) return;
        try {
            const res = await driverAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Driver deleted');
                loadDrivers();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError('Failed to delete'); }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = drivers.slice(startIndex, startIndex + itemsPerPage);

    if (loading) return <div className="content-wrapper">Loading...</div>;

    return (
        <div className="content-wrapper">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Driver Master</h2>
                    <button className="btn btn-primary" onClick={() => handleOpenModal('add')}>Add New Driver</button>
                </div>

                {error && <div className="error-message">{error}</div>}
                {successMsg && <div className="success-message">{successMsg}</div>}

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Driver ID</th>
                                <th>Name</th>
                                <th>Contact</th>
                                <th>License No</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.map((d) => (
                                <tr key={d.id}>
                                    <td>{d.driver_id}</td>
                                    <td>{d.driver_name}</td>
                                    <td>{d.primary_contact_no}</td>
                                    <td>{d.license_no}</td>
                                    <td>
                                        <span className={`badge ${d.driver_status ? 'success' : 'danger'}`}>
                                            {d.driver_status ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="action-icon view" onClick={() => handleOpenModal('view', d)}>
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                            <button className="action-icon edit" onClick={() => handleOpenModal('edit', d)}>
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination currentPage={currentPage} totalItems={drivers.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={'Driver Details'}>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Driver Name</label>
                            <input type="text" className="form-control" value={formData.driver_name} disabled={modalMode !== 'add'} onChange={e => setFormData({ ...formData, driver_name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Blood Group</label>
                            <select className="form-control" value={formData.blood_group} disabled={modalMode !== 'add'} onChange={e => setFormData({ ...formData, blood_group: e.target.value })}>
                                {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Primary Contact</label>
                            <input type="text" className="form-control" value={formData.primary_contact_no} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, primary_contact_no: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Secondary Contact</label>
                            <input type="text" className="form-control" value={formData.secondary_contact_no} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, secondary_contact_no: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Address</label>
                        <textarea className="form-control" value={formData.address} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, address: e.target.value })} required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">License No</label>
                            <input type="text" className="form-control" value={formData.license_no} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, license_no: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">License Exp Date</label>
                            <input type="date" className="form-control" value={formData.license_exp_date} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, license_exp_date: e.target.value })} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Aadhar No</label>
                            <input type="text" className="form-control" value={formData.aadhar_no} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, aadhar_no: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Status</label>
                            <div className="toggle-container">
                                <label className="switch">
                                    <input type="checkbox" checked={formData.driver_status} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, driver_status: e.target.checked })} />
                                    <span className="slider round"></span>
                                </label>
                                <span style={{ marginLeft: '10px' }}>{formData.driver_status ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="card-subtitle">Bank Details</div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Bank Name</label>
                            <input type="text" className="form-control" value={formData.bank_name} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, bank_name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Branch</label>
                            <input type="text" className="form-control" value={formData.branch} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, branch: e.target.value })} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Account No</label>
                            <input type="text" className="form-control" value={formData.account_number} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, account_number: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">IFSC Code</label>
                            <input type="text" className="form-control" value={formData.ifsc_code} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, ifsc_code: e.target.value })} required />
                        </div>
                    </div>
                    {modalMode !== 'view' && (
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Save</button>
                        </div>
                    )}
                </form>
            </Modal>
        </div>
    );
};

export default DriverList;
