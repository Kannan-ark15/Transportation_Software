import React, { useState, useEffect } from 'react';
import { productAPI } from '../services/api';
import Pagination from './Pagination';
import Modal from './Modal';

const ProductList = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [formData, setFormData] = useState({ product_name: '', measuring_unit: 'Tons' });

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const res = await productAPI.getAll();
            if (res.success) setProducts(res.data);
        } catch (err) {
            setError('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (mode, product = null) => {
        setModalMode(mode);
        setSelectedProduct(product);
        if (product) {
            setFormData({ product_name: product.product_name, measuring_unit: product.measuring_unit });
        } else {
            setFormData({ product_name: '', measuring_unit: 'Tons' });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (modalMode === 'add') {
                res = await productAPI.create(formData);
            } else {
                res = await productAPI.update(selectedProduct.id, formData);
            }

            if (res.success) {
                setSuccessMsg(`Product ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
                setModalOpen(false);
                loadProducts();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete ${name}?`)) return;
        try {
            const res = await productAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Product deleted');
                loadProducts();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            setError('Failed to delete');
        }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = products.slice(startIndex, startIndex + itemsPerPage);

    if (loading) return <div className="content-wrapper">Loading...</div>;

    return (
        <div className="content-wrapper">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Product Master</h2>
                    <button className="btn btn-primary" onClick={() => handleOpenModal('add')}>
                        Add New Product
                    </button>
                </div>

                {error && <div className="error-message">{error}</div>}
                {successMsg && <div className="success-message">{successMsg}</div>}

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Product Name</th>
                                <th>Measuring Unit</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.map((p, i) => (
                                <tr key={p.id}>
                                    <td>{startIndex + i + 1}</td>
                                    <td>{p.product_name}</td>
                                    <td>{p.measuring_unit}</td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="action-icon view" onClick={() => handleOpenModal('view', p)}>
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                            <button className="action-icon edit" onClick={() => handleOpenModal('edit', p)}>
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button className="action-icon delete" onClick={() => handleDelete(p.id, p.product_name)}>
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
                    totalItems={products.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                />
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalMode === 'add' ? 'Add Product' : modalMode === 'edit' ? 'Edit Product' : 'Product Details'}
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label required">Product Name</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.product_name}
                            disabled={modalMode === 'view'}
                            onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Measuring Unit</label>
                        <select
                            className="form-control"
                            value={formData.measuring_unit}
                            disabled={modalMode === 'view'}
                            onChange={e => setFormData({ ...formData, measuring_unit: e.target.value })}
                        >
                            <option value="Tons">Tons</option>
                            <option value="Nos">Nos</option>
                        </select>
                    </div>
                    {modalMode !== 'view' && (
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{modalMode === 'add' ? 'Save' : 'Update'}</button>
                        </div>
                    )}
                </form>
            </Modal>
        </div>
    );
};

export default ProductList;
