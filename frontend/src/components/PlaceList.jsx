import React, { useState, useEffect } from 'react';
import { placeAPI, companyAPI, productAPI } from '../services/api';
import Pagination from './Pagination';
import Modal from './Modal';

const PlaceList = () => {
    const [places, setPlaces] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [formData, setFormData] = useState({
        company_id: '', from_place: '', to_place: '', district: '', distance_km: '', product_id: ''
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [pRes, cRes, prRes] = await Promise.all([
                placeAPI.getAll(),
                companyAPI.getAll(),
                productAPI.getAll()
            ]);
            if (pRes.success) setPlaces(pRes.data);
            if (cRes.success) setCompanies(cRes.data);
            if (prRes.success) setProducts(prRes.data);
        } catch (err) { setError('Failed to load data'); }
        finally { setLoading(false); }
    };

    const handleOpenModal = (mode, place = null) => {
        setModalMode(mode);
        setSelectedPlace(place);
        if (place) {
            setFormData({
                company_id: place.company_id,
                from_place: place.from_place,
                to_place: place.to_place,
                district: place.district,
                distance_km: place.distance_km,
                product_id: place.product_id
            });
        } else {
            setFormData({ company_id: '', from_place: '', to_place: '', district: '', distance_km: '', product_id: '' });
        }
        setModalOpen(true);
    };

    const handleCompanyChange = (companyId) => {
        const company = companies.find(c => c.id === parseInt(companyId));
        setFormData({
            ...formData,
            company_id: companyId,
            from_place: company ? company.place : ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (modalMode === 'add') res = await placeAPI.create(formData);
            else res = await placeAPI.update(selectedPlace.id, formData);

            if (res.success) {
                setSuccessMsg(`Place ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
                setModalOpen(false);
                loadData();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete route to ${name}?`)) return;
        try {
            const res = await placeAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Place deleted');
                loadData();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError('Failed to delete'); }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = places.slice(startIndex, startIndex + itemsPerPage);

    if (loading) return <div className="content-wrapper">Loading...</div>;

    return (
        <div className="content-wrapper">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Place Master</h2>
                    <button className="btn btn-primary" onClick={() => handleOpenModal('add')}>Add New Route</button>
                </div>

                {error && <div className="error-message">{error}</div>}
                {successMsg && <div className="success-message">{successMsg}</div>}

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Company</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Distance (KM)</th>
                                <th>Product</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.company_name}</td>
                                    <td>{p.from_place}</td>
                                    <td>{p.to_place}</td>
                                    <td>{p.distance_km} KM</td>
                                    <td>{p.product_name}</td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="action-icon view" onClick={() => handleOpenModal('view', p)}>
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                            <button className="action-icon edit" onClick={() => handleOpenModal('edit', p)}>
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button className="action-icon delete" onClick={() => handleDelete(p.id, p.to_place)}>
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination currentPage={currentPage} totalItems={places.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={'Route Details'}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label required">Company Name</label>
                        <select className="form-control" value={formData.company_id} disabled={modalMode === 'view'} onChange={e => handleCompanyChange(e.target.value)} required>
                            <option value="">Select Company</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">From Place (Autofill)</label>
                            <input type="text" className="form-control" value={formData.from_place} readOnly />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">To Place</label>
                            <input type="text" className="form-control" value={formData.to_place} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, to_place: e.target.value })} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">District</label>
                            <input type="text" className="form-control" value={formData.district} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, district: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Distance in KM</label>
                            <input type="number" step="0.1" className="form-control" value={formData.distance_km} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, distance_km: e.target.value })} required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Product</label>
                        <select className="form-control" value={formData.product_id} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, product_id: e.target.value })} required>
                            <option value="">Select Product</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                        </select>
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

export default PlaceList;
