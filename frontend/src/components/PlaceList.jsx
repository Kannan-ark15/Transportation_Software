import React, { useState, useEffect, useRef } from 'react';
import DataToolbar from './common/DataToolbar';
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
    const [rateChartRows, setRateChartRows] = useState([]);
    const [rateChartLoading, setRateChartLoading] = useState(false);
    const [rateChartNotice, setRateChartNotice] = useState('');
    const rateChartNoticeTimeout = useRef(null);

    const vehicleTypes = ['LCV', 'HCV'];
    const subTypesMap = {
        'LCV': ['6 WHEELER'],
        'HCV': ['14 WHEELER', '16 WHEELER', '22 WHEELER']
    };
    const bodyTypesMap = {
        '6 WHEELER': ['Open Container', 'Container'],
        '14 WHEELER': ['Open Container', 'Container', 'Bulker'],
        '16 WHEELER': ['Open Container', 'Container', 'Bulker'],
        '22 WHEELER': ['Trailer', 'Container']
    };

    const rateTypeOptions = vehicleTypes.flatMap((vehicleType) =>
        (subTypesMap[vehicleType] || []).flatMap((subType) =>
            (bodyTypesMap[subType] || []).map((bodyType) => ({
                value: `${vehicleType}|${subType}|${bodyType}`,
                label: `${vehicleType} - ${subType} - ${bodyType}`,
                vehicle_type: vehicleType,
                vehicle_sub_type: subType,
                vehicle_body_type: bodyType
            }))
        )
    );

    const createRateChartRow = (data = {}) => ({
        _key: data.id ? `rate-${data.id}` : `rate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        vehicle_type: data.vehicle_type || '',
        vehicle_sub_type: data.vehicle_sub_type || '',
        vehicle_body_type: data.vehicle_body_type || '',
        rcl_freight: data.rcl_freight ?? '',
        kt_freight: data.kt_freight ?? '',
        driver_bata: data.driver_bata ?? '',
        advance: data.advance ?? '',
        unloading: data.unloading ?? '',
        tarpaulin: data.tarpaulin ?? '',
        city_tax: data.city_tax ?? '',
        maintenance: data.maintenance ?? ''
    });

    const getRateTypeKey = (row) => (
        row.vehicle_type && row.vehicle_sub_type && row.vehicle_body_type
            ? `${row.vehicle_type}|${row.vehicle_sub_type}|${row.vehicle_body_type}`
            : ''
    );

    useEffect(() => { loadData(); }, []);
    useEffect(() => {
        return () => {
            if (rateChartNoticeTimeout.current) clearTimeout(rateChartNoticeTimeout.current);
        };
    }, []);

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

    const handleImport = async (importedData) => {
        try {
            setLoading(true);
            let successCount = 0;
            let errors = [];

            for (const row of importedData) {
                const companyName = row['Company'] || row['company_name'];
                const productName = row['Product'] || row['product_name'];

                const company = companies.find(c => c.company_name?.toLowerCase() === companyName?.toLowerCase());
                const product = products.find(p => p.product_name?.toLowerCase() === productName?.toLowerCase());

                if (!company || !product) {
                    errors.push(`${row['To Place'] || 'Unknown Route'} (Missing Company/Product)`);
                    continue;
                }

                const mappedData = {
                    company_id: company.id,
                    from_place: company.place, // Auto-fill source from company place
                    to_place: row['To Place'] || row['to_place'],
                    district: row['District'] || row['district'],
                    distance_km: row['Distance'] || row['distance_km'],
                    product_id: product.id
                };

                if (!mappedData.to_place || !mappedData.distance_km) continue;

                try {
                    await placeAPI.create(mappedData);
                    successCount++;
                } catch (err) {
                    errors.push(mappedData.to_place);
                }
            }

            setSuccessMsg(`Imported ${successCount} routes successfully.`);
            if (errors.length > 0) alert(`Failed to import: ${errors.join(', ')}`);
            loadData();
        } catch (err) {
            setError('Import failed');
        } finally {
            setLoading(false);
        }
    };

    const exportColumns = [
        { header: 'Pass Company', dataKey: 'company_name' },
        { header: 'From', dataKey: 'from_place' },
        { header: 'To', dataKey: 'to_place' },
        { header: 'District', dataKey: 'district' },
        { header: 'Distance (KM)', dataKey: 'distance_km' },
        { header: 'Product', dataKey: 'product_name' },
    ];

    const handleOpenModal = async (mode, place = null) => {
        setModalMode(mode);
        setSelectedPlace(place);
        setError('');

        if (place) {
            setFormData({
                company_id: place.company_id.toString(),
                from_place: place.from_place,
                to_place: place.to_place,
                district: place.district,
                distance_km: place.distance_km,
                product_id: place.product_id.toString()
            });
            setRateChartRows([]);
        } else {
            setFormData({ company_id: '', from_place: '', to_place: '', district: '', distance_km: '', product_id: '' });
            setRateChartRows([createRateChartRow()]);
        }

        setModalOpen(true);

        if (place && (mode === 'edit' || mode === 'view')) {
            try {
                setRateChartLoading(true);
                const detailRes = await placeAPI.getById(place.id);
                if (detailRes.success) {
                    const detail = detailRes.data;
                    setFormData({
                        company_id: detail.company_id?.toString() || '',
                        from_place: detail.from_place || '',
                        to_place: detail.to_place || '',
                        district: detail.district || '',
                        distance_km: detail.distance_km || '',
                        product_id: detail.product_id?.toString() || ''
                    });
                    const chartRows = Array.isArray(detail.rate_cards) && detail.rate_cards.length > 0
                        ? detail.rate_cards.map(createRateChartRow)
                        : [createRateChartRow()];
                    setRateChartRows(chartRows);
                }
            } catch (err) {
                setError('Failed to load rate chart details');
                setRateChartRows([createRateChartRow()]);
            } finally {
                setRateChartLoading(false);
            }
        }
    };

    const handleCompanyChange = (companyId) => {
        const company = companies.find(c => c.id === parseInt(companyId));
        setFormData({
            ...formData,
            company_id: companyId,
            from_place: company ? company.place : ''
        });
    };

    const handleAddRateRow = () => {
        setRateChartRows(prev => [...prev, createRateChartRow()]);
    };

    const handleRemoveRateRow = (index) => {
        if (rateChartRows.length <= 1) {
            setRateChartNotice('At least one rate card is mandatory.');
            if (rateChartNoticeTimeout.current) clearTimeout(rateChartNoticeTimeout.current);
            rateChartNoticeTimeout.current = setTimeout(() => setRateChartNotice(''), 2500);
            return;
        }
        setRateChartRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleRateTypeChange = (index, value) => {
        const selected = rateTypeOptions.find(option => option.value === value);
        if (!selected) return;
        setRateChartRows(prev => prev.map((row, i) => (
            i === index
                ? {
                    ...row,
                    vehicle_type: selected.vehicle_type,
                    vehicle_sub_type: selected.vehicle_sub_type,
                    vehicle_body_type: selected.vehicle_body_type
                }
                : row
        )));
    };

    const handleRateRowChange = (index, field, value) => {
        setRateChartRows(prev => prev.map((row, i) => {
            if (i !== index) return row;
            const updated = { ...row, [field]: value };
            if (field === 'rcl_freight') {
                const parsed = parseFloat(value);
                updated.kt_freight = Number.isFinite(parsed) ? (Math.floor(parsed) - 1).toString() : '';
            }
            return updated;
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const sanitizedRateCards = rateChartRows
                .map(({ _key, ...rest }) => rest)
                .filter(row => Object.values(row).some(val => val !== '' && val !== null && val !== undefined));

            if (sanitizedRateCards.length === 0) {
                setError('Please add at least one rate chart entry.');
                setSubmitting(false);
                return;
            }

            const missingRequired = sanitizedRateCards.some(row => !row.vehicle_type || !row.vehicle_sub_type || !row.vehicle_body_type || row.rcl_freight === '' || row.rcl_freight === null || row.rcl_freight === undefined);
            if (missingRequired) {
                setError('Please complete required rate chart fields (Type and RCL Freight).');
                setSubmitting(false);
                return;
            }

            const rateCardsPayload = sanitizedRateCards.map(row => {
                const rcl = parseFloat(row.rcl_freight);
                const kt = row.kt_freight !== '' && row.kt_freight !== null && row.kt_freight !== undefined
                    ? row.kt_freight
                    : (Number.isFinite(rcl) ? Math.floor(rcl) - 1 : '');
                return {
                    ...row,
                    kt_freight: kt
                };
            });

            const payload = {
                ...formData,
                rate_cards: rateCardsPayload
            };

            let res;
            if (modalMode === 'add') res = await placeAPI.create(payload);
            else res = await placeAPI.update(selectedPlace.id, payload);

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
                    <div className="flex items-center gap-3">
                        <DataToolbar
                            onImport={handleImport}
                            data={places}
                            columns={exportColumns}
                            title="Place Master Report"
                            fileName="places_list"
                        />
                        <Button
                            onClick={() => handleOpenModal('add')}
                            className="bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-200"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Route
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
                <DialogContent className="min-w-0 w-[96vw] max-w-[1100px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {modalMode === 'add' ? <Plus className="w-5 h-5 text-orange-600" /> : modalMode === 'edit' ? <Edit className="w-5 h-5 text-amber-600" /> : <Eye className="w-5 h-5 text-blue-600" />}
                            {modalMode === 'add' ? 'Add New Route' : modalMode === 'edit' ? 'Edit Route' : 'Route Details'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="min-w-0 space-y-4 py-4">
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

                        <div className="space-y-3 pt-2">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <Label className="text-base font-semibold text-slate-900">Rate Chart</Label>
                                    <p className="text-xs text-slate-500">Add one or more rate cards for this place.</p>
                                </div>
                                {modalMode !== 'view' && (
                                        <Button type="button" variant="outline" onClick={handleAddRateRow}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Another
                                        </Button>
                                )}
                            </div>

                            <div className="min-w-0 w-full max-w-full rounded-lg border border-slate-200 overflow-x-auto bg-white">
                                {rateChartLoading ? (
                                    <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
                                        <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
                                        Loading rate chart...
                                    </div>
                                ) : (
                                    <table className="min-w-[1200px] w-full text-xs">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-700">Type *</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-700">RCL Freight *</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-700">KT Freight *</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-700">Driver Bata</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-700">Advance</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-700">Unloading</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-700">Tarpaulin</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-700">City Tax</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-700">Maintenance</th>
                                                <th className="px-3 py-2 text-center font-semibold text-slate-700">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rateChartRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={10} className="py-8 text-center text-slate-500">
                                                        No rate chart entries yet.
                                                    </td>
                                                </tr>
                                            ) : (
                                                rateChartRows.map((row, index) => (
                                                    <tr key={row._key} className="border-t border-slate-100">
                                                        <td className="px-3 py-2 min-w-[260px]">
                                                            <Select
                                                                value={getRateTypeKey(row)}
                                                                onValueChange={(value) => handleRateTypeChange(index, value)}
                                                                disabled={modalMode === 'view'}
                                                            >
                                                                <SelectTrigger className="h-9 text-xs">
                                                                    <SelectValue placeholder="Select type" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {rateTypeOptions.map(option => (
                                                                        <SelectItem key={option.value} value={option.value}>
                                                                            {option.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="number"
                                                                value={row.rcl_freight}
                                                                disabled={modalMode === 'view'}
                                                                onChange={(e) => handleRateRowChange(index, 'rcl_freight', e.target.value)}
                                                                className="h-9 text-xs"
                                                                placeholder="Enter RCL"
                                                                required
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="number"
                                                                value={row.kt_freight}
                                                                disabled={modalMode === 'view'}
                                                                onChange={(e) => handleRateRowChange(index, 'kt_freight', e.target.value)}
                                                                className="h-9 text-xs"
                                                                placeholder="Enter KT"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="number"
                                                                value={row.driver_bata}
                                                                disabled={modalMode === 'view'}
                                                                onChange={(e) => handleRateRowChange(index, 'driver_bata', e.target.value)}
                                                                className="h-9 text-xs"
                                                                placeholder="Enter bata"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="number"
                                                                value={row.advance}
                                                                disabled={modalMode === 'view'}
                                                                onChange={(e) => handleRateRowChange(index, 'advance', e.target.value)}
                                                                className="h-9 text-xs"
                                                                placeholder="Enter advance"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="number"
                                                                value={row.unloading}
                                                                disabled={modalMode === 'view'}
                                                                onChange={(e) => handleRateRowChange(index, 'unloading', e.target.value)}
                                                                className="h-9 text-xs"
                                                                placeholder="Enter unloading"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="number"
                                                                value={row.tarpaulin}
                                                                disabled={modalMode === 'view'}
                                                                onChange={(e) => handleRateRowChange(index, 'tarpaulin', e.target.value)}
                                                                className="h-9 text-xs"
                                                                placeholder="Enter tarpaulin"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="number"
                                                                value={row.city_tax}
                                                                disabled={modalMode === 'view'}
                                                                onChange={(e) => handleRateRowChange(index, 'city_tax', e.target.value)}
                                                                className="h-9 text-xs"
                                                                placeholder="Enter city tax"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="number"
                                                                value={row.maintenance}
                                                                disabled={modalMode === 'view'}
                                                                onChange={(e) => handleRateRowChange(index, 'maintenance', e.target.value)}
                                                                className="h-9 text-xs"
                                                                placeholder="Enter maintenance"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            {modalMode !== 'view' ? (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                                                onClick={() => handleRemoveRateRow(index)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        ) : (
                                                            <span className="text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                            {modalMode !== 'view' && (
                                <div className="flex justify-start">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleAddRateRow}
                                        className="h-8 px-3 text-xs"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add Rate Card
                                    </Button>
                                </div>
                            )}

                            <p className="text-[11px] text-slate-400">
                                KT Freight auto-calculates from RCL Freight unless manually overridden.
                            </p>
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

                    {rateChartNotice && (
                        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
                            {rateChartNotice}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PlaceList;
