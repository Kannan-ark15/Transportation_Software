import React, { useState, useEffect } from 'react';
import { dealerAPI, placeAPI } from '../services/api';
import Pagination from './Pagination';
import Modal from './Modal';

const DealerList = () => {
    const [dealers, setDealers] = useState([]);
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedDealer, setSelectedDealer] = useState(null);
    const [formData, setFormData] = useState({
        place_id: '', district: '', dealer_name: '', gst_no: '',
        contact_no_1: '', contact_no_2: '', sales_area: '', sales_officer_no: ''
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [dRes, pRes] = await Promise.all([
                dealerAPI.getAll(),
                placeAPI.getAll()
            ]);
            if (dRes.success) setDealers(dRes.data);
            if (pRes.success) setPlaces(pRes.data);
        } catch (err) { setError('Failed to load data'); }
        finally { setLoading(false); }
    };

    const handleOpenModal = (mode, dealer = null) => {
        setModalMode(mode);
        setSelectedDealer(dealer);
        if (dealer) {
            setFormData({
                place_id: dealer.place_id,
                district: dealer.district,
                dealer_name: dealer.dealer_name,
                gst_no: dealer.gst_no,
                contact_no_1: dealer.contact_no_1,
                contact_no_2: dealer.contact_no_2 || '',
                sales_area: dealer.sales_area,
                sales_officer_no: dealer.sales_officer_no
            });
        } else {
            setFormData({ place_id: '', district: '', dealer_name: '', gst_no: '', contact_no_1: '', contact_no_2: '', sales_area: '', sales_officer_no: '' });
        }
        setModalOpen(true);
    };

    const handlePlaceChange = (placeId) => {
        const place = places.find(p => p.id === parseInt(placeId));
        setFormData({
            ...formData,
            place_id: placeId,
            district: place ? place.district : ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (modalMode === 'add') res = await dealerAPI.create(formData);
            else res = await dealerAPI.update(selectedDealer.id, formData);

            if (res.success) {
                setSuccessMsg(`Dealer ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
                setModalOpen(false);
                loadData();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete ${name}?`)) return;
        try {
            const res = await dealerAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Dealer deleted');
                loadData();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError('Failed to delete'); }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = dealers.slice(startIndex, startIndex + itemsPerPage);

    if (loading) return <div className="content-wrapper">Loading...</div>;

    return (
        <div className="content-wrapper">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Dealer Master</h2>
                    <button className="btn btn-primary" onClick={() => handleOpenModal('add')}>Add New Dealer</button>
                </div>

                {error && <div className="error-message">{error}</div>}
                {successMsg && <div className="success-message">{successMsg}</div>}

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Dealer Name</th>
                                <th>Place</th>
                                <th>GST No</th>
                                <th>Contact No</th>
                                <th>Sales Area</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.map((d, i) => (
                                <tr key={d.id}>
                                    <td>{startIndex + i + 1}</td>
                                    <td>{d.dealer_name}</td>
                                    <td>{d.place_name}</td>
                                    <td>{d.gst_no}</td>
                                    <td>{d.contact_no_1}</td>
                                    <td>{d.sales_area}</td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="action-icon view" onClick={() => handleOpenModal('view', d)}>
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                            <button className="action-icon edit" onClick={() => handleOpenModal('edit', d)}>
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button className="action-icon delete" onClick={() => handleDelete(d.id, d.dealer_name)}>
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination currentPage={currentPage} totalItems={dealers.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={'Dealer Details'}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label required">Place</label>
                        <select className="form-control" value={formData.place_id} disabled={modalMode === 'view'} onChange={e => handlePlaceChange(e.target.value)} required>
                            <option value="">Select Place</option>
                            {places.map(p => <option key={p.id} value={p.id}>{p.to_place}</option>)}
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">District (Autofill)</label>
                            <input type="text" className="form-control" value={formData.district} readOnly />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Dealer Name</label>
                            <input type="text" className="form-control" value={formData.dealer_name} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, dealer_name: e.target.value })} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">GST No</label>
                            <input type="text" className="form-control" value={formData.gst_no} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, gst_no: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Sales Area</label>
                            <input type="text" className="form-control" value={formData.sales_area} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, sales_area: e.target.value })} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Contact No 1</label>
                            <input type="text" className="form-control" value={formData.contact_no_1} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, contact_no_1: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contact No 2</label>
                            <input type="text" className="form-control" value={formData.contact_no_2} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, contact_no_2: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Sales Officer No</label>
                        <input type="text" className="form-control" value={formData.sales_officer_no} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, sales_officer_no: e.target.value })} required />
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

export default DealerList;
