import React, { useState, useEffect } from 'react';
import { placeAPI, companyAPI, productAPI } from '../services/api';
import Pagination from './Pagination';
import {
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    MapPin,
    Navigation,
    SearchX,
    Loader2,
    Route,
    ArrowRight,
    Building,
    Package,
    Compass
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
    const [submitting, setSubmitting] = useState(false);
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
        } catch (err) { setError('Failed to load route data'); }
        finally { setLoading(false); }
    };

    const handleOpenModal = (mode, place = null) => {
        setModalMode(mode);
        setSelectedPlace(place);
        if (place) {
            setFormData({
                company_id: place.company_id.toString(),
                from_place: place.from_place,
                to_place: place.to_place,
                district: place.district,
                distance_km: place.distance_km,
                product_id: place.product_id.toString()
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
            setSubmitting(true);
            let res;
            if (modalMode === 'add') res = await placeAPI.create(formData);
            else res = await placeAPI.update(selectedPlace.id, formData);

            if (res.success) {
                setSuccessMsg(`Route ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
                setModalOpen(false);
                loadData();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete route to "${name}"?`)) return;
        try {
            const res = await placeAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Route deleted successfully');
                loadData();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError('Failed to delete route'); }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = places.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-lg font-medium">Loading routes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Route className="w-6 h-6 text-orange-600" />
                            Place Master
                        </CardTitle>
                        <p className="text-sm text-slate-500">Define transportation routes and distance mappings</p>
                    </div>
                    <Button
                        onClick={() => handleOpenModal('add')}
                        className="bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-200"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Route
                    </Button>
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

                    {places.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <SearchX className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Routes Found</h3>
                            <p className="text-slate-500 mb-6">Start by mapping your first transportation route.</p>
                            <Button variant="outline" onClick={() => handleOpenModal('add')}>
                                Add New Route
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[80px] font-bold text-slate-700">S.No</TableHead>
                                            <TableHead className="font-bold text-slate-700">Company</TableHead>
                                            <TableHead className="font-bold text-slate-700">Route Map (From → To)</TableHead>
                                            <TableHead className="font-bold text-slate-700">Distance</TableHead>
                                            <TableHead className="font-bold text-slate-700">Product</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((p, i) => (
                                            <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-500 text-xs">
                                                    {startIndex + i + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Building className="w-4 h-4 text-slate-400" />
                                                        <span className="font-semibold text-slate-900">{p.company_name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-slate-500 font-medium">{p.from_place}</span>
                                                        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                                                        <span className="text-slate-900 font-bold">{p.to_place}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="border-orange-100 text-orange-700 bg-orange-50/30">
                                                        {p.distance_km} KM
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-slate-600">
                                                        <Package className="w-4 h-4 text-slate-400" />
                                                        {p.product_name}
                                                    </div>
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
                                                            onClick={() => handleDelete(p.id, p.to_place)}
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
                                    totalItems={places.length}
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
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {modalMode === 'add' ? <Plus className="w-5 h-5 text-orange-600" /> : modalMode === 'edit' ? <Edit className="w-5 h-5 text-amber-600" /> : <Eye className="w-5 h-5 text-blue-600" />}
                            {modalMode === 'add' ? 'Add New Route' : modalMode === 'edit' ? 'Edit Route' : 'Route Details'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="company" className="required flex items-center gap-2">
                                <Building className="w-3 h-3 text-slate-400" /> Client Company
                            </Label>
                            <Select
                                value={formData.company_id}
                                onValueChange={handleCompanyChange}
                                disabled={modalMode === 'view'}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select corporate client" />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>
                                            {c.company_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 text-slate-500">
                                <Label htmlFor="from">Source (Autofill)</Label>
                                <Input
                                    id="from"
                                    value={formData.from_place}
                                    readOnly
                                    className="bg-slate-50 border-slate-100 italic"
                                    placeholder="Select company first"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="to" className="required flex items-center gap-2">
                                    <MapPin className="w-3 h-3 text-slate-400" /> Destination
                                </Label>
                                <Input
                                    id="to"
                                    value={formData.to_place}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, to_place: e.target.value })}
                                    placeholder="City/Plant name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="district" className="required flex items-center gap-2">
                                    <Compass className="w-3 h-3 text-slate-400" /> District
                                </Label>
                                <Input
                                    id="district"
                                    value={formData.district}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                                    placeholder="Region"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="distance" className="required">Distance (KM)</Label>
                                <Input
                                    id="distance"
                                    type="number"
                                    step="0.1"
                                    value={formData.distance_km}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, distance_km: e.target.value })}
                                    placeholder="0.0"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="product" className="required flex items-center gap-2">
                                <Package className="w-3 h-3 text-slate-400" /> Assigned Product
                            </Label>
                            <Select
                                value={formData.product_id}
                                onValueChange={val => setFormData({ ...formData, product_id: val })}
                                disabled={modalMode === 'view'}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select transport good" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id.toString()}>
                                            {p.product_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-6 border-t border-slate-100">
                            {modalMode !== 'view' ? (
                                <>
                                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className={cn(
                                            "min-w-[120px]",
                                            modalMode === 'edit' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-100" : "bg-orange-600 hover:bg-orange-700 shadow-orange-100"
                                        )}
                                    >
                                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {modalMode === 'add' ? 'Create Route' : 'Update Map'}
                                    </Button>
                                </>
                            ) : (
                                <Button type="button" onClick={() => setModalOpen(false)}>
                                    Close
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PlaceList;
