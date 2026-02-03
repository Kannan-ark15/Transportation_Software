import React, { useState, useEffect } from 'react';
import { pumpAPI } from '../services/api';
import Pagination from './Pagination';
import Modal from './Modal';

const PumpList = () => {
    const [pumps, setPumps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedPump, setSelectedPump] = useState(null);
    const [formData, setFormData] = useState({
        pump_name: '', rate: '', contact_person: '', contact_no: '', email_id: '',
        company_address_1: '', company_address_2: '', place: '', pan_no: '', gst_no: '',
        bank_name: '', branch: '', account_number: '', ifsc_code: ''
    });

    useEffect(() => { loadPumps(); }, []);

    const loadPumps = async () => {
        try {
            setLoading(true);
            const res = await pumpAPI.getAll();
            if (res.success) setPumps(res.data);
        } catch (err) { setError('Failed to load pumps'); }
        finally { setLoading(false); }
    };

    const handleOpenModal = (mode, pump = null) => {
        setModalMode(mode);
        setSelectedPump(pump);
        if (pump) {
            setFormData({ ...pump, company_address_2: pump.company_address_2 || '' });
        } else {
            setFormData({
                pump_name: '', rate: '', contact_person: '', contact_no: '', email_id: '',
                company_address_1: '', company_address_2: '', place: '', pan_no: '', gst_no: '',
                bank_name: '', branch: '', account_number: '', ifsc_code: ''
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (modalMode === 'add') res = await pumpAPI.create(formData);
            else res = await pumpAPI.update(selectedPump.id, formData);

            if (res.success) {
                setSuccessMsg(`Pump ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
                setModalOpen(false);
                loadPumps();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete ${name}?`)) return;
        try {
            const res = await pumpAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Pump deleted');
                loadPumps();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError('Failed to delete'); }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = pumps.slice(startIndex, startIndex + itemsPerPage);

    if (loading) return <div className="content-wrapper">Loading...</div>;

    return (
        <div className="content-wrapper">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Pump Master</h2>
                    <button className="btn btn-primary" onClick={() => handleOpenModal('add')}>Add New Pump</button>
                </div>

                {error && <div className="error-message">{error}</div>}
                {successMsg && <div className="success-message">{successMsg}</div>}

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Pump Name</th>
                                <th>Rate (₹)</th>
                                <th>Place</th>
                                <th>Contact Person</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.map((p, i) => (
                                <tr key={p.id}>
                                    <td>{startIndex + i + 1}</td>
                                    <td>{p.pump_name}</td>
                                    <td>₹ {p.rate}</td>
                                    <td>{p.place}</td>
                                    <td>{p.contact_person}</td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="action-icon view" onClick={() => handleOpenModal('view', p)}>
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                            <button className="action-icon edit" onClick={() => handleOpenModal('edit', p)}>
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination currentPage={currentPage} totalItems={pumps.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={'Pump Details'}>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Pump Name</label>
                            <input type="text" className="form-control" value={formData.pump_name} disabled={modalMode !== 'add'} onChange={e => setFormData({ ...formData, pump_name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Rate (₹)</label>
                            <input type="number" step="0.01" className="form-control" value={formData.rate} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, rate: e.target.value })} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Contact Person</label>
                            <input type="text" className="form-control" value={formData.contact_person} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contact No</label>
                            <input type="text" className="form-control" value={formData.contact_no} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, contact_no: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Email ID</label>
                            <input type="email" className="form-control" value={formData.email_id} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, email_id: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Place</label>
                            <input type="text" className="form-control" value={formData.place} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, place: e.target.value })} required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Address Line 1</label>
                        <textarea className="form-control" value={formData.company_address_1} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, company_address_1: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Address Line 2</label>
                        <textarea className="form-control" value={formData.company_address_2} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, company_address_2: e.target.value })} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">PAN No</label>
                            <input type="text" className="form-control" value={formData.pan_no} disabled={modalMode !== 'add'} onChange={e => setFormData({ ...formData, pan_no: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">GST No</label>
                            <input type="text" className="form-control" value={formData.gst_no} disabled={modalMode !== 'add'} onChange={e => setFormData({ ...formData, gst_no: e.target.value })} required />
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
                            <button type="submit" className="btn btn-primary">Save Changes</button>
                        </div>
                    )}
                </form>
            </Modal>
        </div>
    );
};

export default PumpList;
