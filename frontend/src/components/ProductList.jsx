import React, { useState, useEffect } from 'react';
import DataToolbar from './common/DataToolbar';
import { productAPI } from '../services/api';
import Pagination from './Pagination';
import {
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    Package,
    SearchX,
    Loader2,
    Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

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
    const [submitting, setSubmitting] = useState(false);

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

    const handleImport = async (importedData) => {
        try {
            setLoading(true);
            let successCount = 0;
            let errors = [];

            for (const row of importedData) {
                const mappedData = {
                    product_name: row['Product Name'] || row['product_name'],
                    measuring_unit: row['Measuring Unit'] || row['measuring_unit'] || 'Tons'
                };

                if (!mappedData.product_name) continue;

                try {
                    await productAPI.create(mappedData);
                    successCount++;
                } catch (err) {
                    errors.push(mappedData.product_name);
                }
            }

            setSuccessMsg(`Imported ${successCount} products successfully.`);
            if (errors.length > 0) alert(`Failed to import: ${errors.join(', ')}`);
            loadProducts();
        } catch (err) {
            setError('Import failed');
        } finally {
            setLoading(false);
        }
    };

    const exportColumns = [
        { header: 'Product Name', dataKey: 'product_name' },
        { header: 'Measuring Unit', dataKey: 'measuring_unit' },
    ];

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
            setSubmitting(true);
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
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
        try {
            const res = await productAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Product deleted successfully');
                loadProducts();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            setError('Failed to delete product');
        }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = products.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-lg font-medium">Loading products...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Package className="w-6 h-6 text-blue-600" />
                            Product Master
                        </CardTitle>
                        <p className="text-sm text-slate-500">Manage your transport goods and materials</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <DataToolbar
                            onImport={handleImport}
                            data={products}
                            columns={exportColumns}
                            title="Product Master Report"
                            fileName="products_list"
                        />
                        <Button
                            onClick={() => handleOpenModal('add')}
                            className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Product
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium">
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-100 text-green-600 rounded-lg text-sm font-medium">
                            {successMsg}
                        </div>
                    )}

                    {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <SearchX className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Products Found</h3>
                            <p className="text-slate-500 mb-6">Start by adding your first product to the delivery system.</p>
                            <Button variant="outline" onClick={() => handleOpenModal('add')}>
                                Add New Product
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[80px] font-bold text-slate-700">S.No</TableHead>
                                            <TableHead className="font-bold text-slate-700">Product Name</TableHead>
                                            <TableHead className="font-bold text-slate-700">Measuring Unit</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((p, i) => (
                                            <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-500">
                                                    {startIndex + i + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-slate-900">{p.product_name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none font-medium">
                                                        {p.measuring_unit}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleOpenModal('view', p)}
                                                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleOpenModal('edit', p)}
                                                            className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(p.id, p.product_name)}
                                                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="mt-4">
                                <Pagination
                                    currentPage={currentPage}
                                    totalItems={products.length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setCurrentPage}
                                    onItemsPerPageChange={setItemsPerPage}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {modalMode === 'add' ? <Plus className="w-5 h-5 text-blue-600" /> : modalMode === 'edit' ? <Edit className="w-5 h-5 text-amber-600" /> : <Eye className="w-5 h-5 text-blue-600" />}
                            {modalMode === 'add' ? 'Add New Product' : modalMode === 'edit' ? 'Edit Product' : 'Product Details'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="product_name" className="required">Product Name</Label>
                            <Input
                                id="product_name"
                                value={formData.product_name}
                                disabled={modalMode === 'view'}
                                onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                                placeholder="Enter product name"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="measuring_unit" className="required text-slate-700">Measuring Unit</Label>
                            <Select
                                value={formData.measuring_unit}
                                onValueChange={val => setFormData({ ...formData, measuring_unit: val })}
                                disabled={modalMode === 'view'}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Tons">
                                        <div className="flex items-center gap-2">
                                            <Scale className="w-4 h-4 text-slate-400" />
                                            Tons
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="Nos">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-slate-400" />
                                            Nos (Number)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="Liters">Liters</SelectItem>
                                    <SelectItem value="Kilograms">Kilograms</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {modalMode !== 'view' && (
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting} className={cn(modalMode === 'edit' ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700")}>
                                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    {modalMode === 'add' ? 'Save Product' : 'Update Changes'}
                                </Button>
                            </DialogFooter>
                        )}
                        {modalMode === 'view' && (
                            <DialogFooter className="pt-4">
                                <Button type="button" onClick={() => setModalOpen(false)}>
                                    Close
                                </Button>
                            </DialogFooter>
                        )}
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProductList;
