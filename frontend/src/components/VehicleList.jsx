import React, { useState, useEffect } from 'react';
import { vehicleAPI } from '../services/api';
import Pagination from './Pagination';
import {
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    Truck,
    MapPin,
    Calendar,
    FileText,
    Hash,
    SearchX,
    Loader2,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    ArrowUpRight,
    ClipboardList,
    Fuel,
    Settings,
    Upload
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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from '@/lib/utils';

import DataToolbar from './common/DataToolbar';

const VehicleList = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        vehicle_no: '',
        vehicle_type: '',
        vehicle_sub_type: '',
        vehicle_body_type: '',
        brand_name: '',
        own_dedicated: 'Own',
        owner_name: '',
        recommended_km: '',
        engine_no: '',
        chasis_no: '',
        rc_expiry_date: '',
        rc_document: null,
        pollution_no: '',
        pollution_expiry_date: '',
        pollution_document: null,
        permit_no: '',
        permit_from_date: '',
        permit_till_date: '',
        permit_document: null,
        insurance_no: '',
        insurance_base_value: '',
        gst_percent: '',
        gst_value: 0,
        insurance_amount: 0,
        insurance_document: null,
        fc_no: '',
        fc_from_date: '',
        fc_till_date: '',
        fc_document: null,
        status: 'Active'
    });

    const [formErrors, setFormErrors] = useState({});

    // Dependent Options Data
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
    const ownersMap = {
        'Own': ['Admin Services', 'Fleet Management'],
        'Dedicated': ['External Partner A', 'Logistics Corp B', 'Express Delivery C']
    };

    useEffect(() => { loadVehicles(); }, []);

    // Calculate GST and Total Insurance Amount
    useEffect(() => {
        const base = parseFloat(formData.insurance_base_value) || 0;
        const gstPercent = parseFloat(formData.gst_percent) || 0;
        const gstVal = (base * gstPercent) / 100;
        const total = base + gstVal;

        setFormData(prev => ({
            ...prev,
            gst_value: gstVal.toFixed(2),
            insurance_amount: total.toFixed(2)
        }));
    }, [formData.insurance_base_value, formData.gst_percent]);

    const loadVehicles = async () => {
        try {
            setLoading(true);
            const res = await vehicleAPI.getAll();
            if (res.success) setVehicles(res.data);
        } catch (err) { setError('Failed to load vehicles'); }
        finally { setLoading(false); }
    };

    // NEW: Handle Bulk Import
    const handleImport = async (importedData) => {
        try {
            setLoading(true);
            let successCount = 0;
            let errors = [];

            // Helper to parse dates (handles JS Dates, Excel serials, and strings)
            const parseDate = (val) => {
                if (!val) return null;

                // If already a JS Date object (from cellDates: true)
                if (val instanceof Date) {
                    // Check for invalid date
                    if (isNaN(val.getTime())) return null;
                    // Adjust for timezone offset if needed, or simply use UTC date part
                    // Using local date string part to avoid timezone shifts dropping a day
                    const year = val.getFullYear();
                    const month = String(val.getMonth() + 1).padStart(2, '0');
                    const day = String(val.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }

                // Handle Excel Serial Date (numbers) - Fallback if cellDates failed
                if (typeof val === 'number') {
                    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                    return date.toISOString().split('T')[0];
                }

                // Handle String Date
                try {
                    const date = new Date(val);
                    if (isNaN(date.getTime())) return null;
                    return date.toISOString().split('T')[0];
                } catch (e) {
                    return null;
                }
            };

            // Iterate and create
            for (const row of importedData) {
                // Map CSV fields to formData schema
                // Expected CSV Headers: Vehicle No, Type, Sub Type, Body Type, Brand, Owner
                const mappedData = {
                    vehicle_no: row['Vehicle No'] || row['vehicle_no'],
                    vehicle_type: row['Type'] || row['vehicle_type'],
                    vehicle_sub_type: row['Sub Type'] || row['vehicle_sub_type'],
                    vehicle_body_type: row['Body Type'] || row['vehicle_body_type'],
                    brand_name: row['Brand'] || row['brand_name'],
                    own_dedicated: row['Category'] || row['own_dedicated'] || 'Own',
                    owner_name: row['Owner'] || row['owner_name'],

                    // Technical Details
                    recommended_km: row['Recommended KM'] || row['recommended_km'] || 0,
                    year_of_manufacture: row['Year'] || row['year_of_manufacture'],
                    engine_no: row['Engine No'] || row['engine_no'],
                    chasis_no: row['Chasis No'] || row['chasis_no'],

                    // Dates - Apply Parsing
                    rc_expiry_date: parseDate(row['RC Expiry']) || parseDate(row['rc_expiry_date']),
                    pollution_expiry_date: parseDate(row['Pollution Expiry']) || parseDate(row['pollution_expiry_date']),
                    permit_from_date: parseDate(row['Permit From']) || parseDate(row['permit_from_date']),
                    permit_till_date: parseDate(row['Permit Till']) || parseDate(row['permit_till_date']),
                    fc_from_date: parseDate(row['FC From']) || parseDate(row['fc_from_date']),
                    fc_till_date: parseDate(row['FC Till']) || parseDate(row['fc_till_date']),

                    // Mandatory Document Numbers & Values (Strict Mode Support)
                    pollution_no: row['Pollution No'] || row['pollution_no'] || 'NA',
                    permit_no: row['Permit No'] || row['permit_no'] || 'NA',
                    fc_no: row['FC No'] || row['fc_no'] || 'NA',
                    insurance_no: row['Insurance No'] || row['insurance_no'] || 'NA',
                    insurance_base_value: row['Insurance Base Value'] || row['insurance_base_value'] || 0,
                    insurance_amount: row['Insurance Amount'] || row['insurance_amount'] || 0,
                    gst_percent: row['GST %'] || row['gst_percent'] || 0,

                    status: 'Active'
                };

                // Basic validation skip
                if (!mappedData.vehicle_no) continue;

                try {
                    await vehicleAPI.create(mappedData);
                    successCount++;
                } catch (err) {
                    errors.push(mappedData.vehicle_no);
                }
            }

            setSuccessMsg(`Imported ${successCount} vehicles successfully.`);
            if (errors.length > 0) alert(`Failed to import: ${errors.join(', ')}`);
            loadVehicles();
        } catch (err) {
            setError('Import failed');
        } finally {
            setLoading(false);
        }
    };

    // Columns for PDF Export
    const exportColumns = [
        { header: 'Vehicle No', dataKey: 'vehicle_no' },
        { header: 'Type', dataKey: 'vehicle_type' },
        { header: 'Sub Type', dataKey: 'vehicle_sub_type' },
        { header: 'Owner', dataKey: 'owner_name' },
        { header: 'Expiry', dataKey: 'rc_expiry_date' },
        { header: 'Status', dataKey: 'status' },
    ];

    // ... existing functions ...
    const handleOpenModal = (mode, vehicle = null) => {
        setModalMode(mode);
        setSelectedVehicle(vehicle);
        setFormErrors({});
        if (vehicle) {
            setFormData({ ...vehicle });
        } else {
            setFormData({
                vehicle_no: '',
                vehicle_type: '',
                vehicle_sub_type: '',
                vehicle_body_type: '',
                brand_name: '',
                own_dedicated: 'Own',
                owner_name: '',
                recommended_km: '',
                engine_no: '',
                chasis_no: '',
                rc_expiry_date: '',
                rc_document: null,
                pollution_no: '',
                pollution_expiry_date: '',
                pollution_document: null,
                permit_no: '',
                permit_from_date: '',
                permit_till_date: '',
                permit_document: null,
                insurance_no: '',
                insurance_base_value: '',
                gst_percent: '',
                gst_value: 0,
                insurance_amount: 0,
                insurance_document: null,
                fc_no: '',
                fc_from_date: '',
                fc_till_date: '',
                fc_document: null,
                status: 'Active'
            });
        }
        setModalOpen(true);
    };

    const validate = () => {
        const errors = {};
        const mandatoryFields = [
            'vehicle_no', 'vehicle_type', 'vehicle_sub_type', 'vehicle_body_type',
            'brand_name', 'own_dedicated', 'owner_name', 'recommended_km',
            'rc_expiry_date', 'pollution_no', 'pollution_expiry_date',
            'permit_no', 'permit_from_date', 'permit_till_date',
            'insurance_no', 'insurance_base_value', 'fc_no',
            'fc_from_date', 'fc_till_date'
        ];

        mandatoryFields.forEach(field => {
            if (!formData[field] || String(formData[field]).trim() === '') {
                errors[field] = 'Required';
            }
        });

        if (formData.vehicle_no && !/^[A-Z0-9]+$/.test(formData.vehicle_no)) {
            errors.vehicle_no = 'Alphanumeric only (e.g. TN01AB1234)';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setSubmitting(true);
            let res;
            if (modalMode === 'add') res = await vehicleAPI.create(formData);
            else res = await vehicleAPI.update(selectedVehicle.id, formData);

            if (res.success) {
                setSuccessMsg(`Vehicle ${modalMode === 'add' ? 'registered' : 'updated'} successfully`);
                setModalOpen(false);
                loadVehicles();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id, no) => {
        if (!window.confirm(`Are you sure you want to delete vehicle "${no}"?`)) return;
        try {
            const res = await vehicleAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Vehicle deleted successfully');
                loadVehicles();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError('Failed to delete vehicle'); }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = vehicles.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-lg font-medium">Loading vehicle fleet...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Truck className="w-6 h-6 text-blue-600" />
                            Vehicle Master
                        </CardTitle>
                        <p className="text-sm text-slate-500">Manage your fleet, documents, and insurance details</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <DataToolbar
                            onImport={handleImport}
                            data={vehicles}
                            columns={exportColumns}
                            title="Vehicle Master Report"
                            fileName="vehicles_list"
                        />
                        <Button
                            onClick={() => handleOpenModal('add')}
                            className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Register New Vehicle
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

                    {vehicles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <SearchX className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Vehicles Found</h3>
                            <p className="text-slate-500 mb-6">Start by registering your first fleet vehicle.</p>
                            <Button variant="outline" onClick={() => handleOpenModal('add')}>
                                Register New Vehicle
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[80px] font-bold text-slate-700">S.No</TableHead>
                                            <TableHead className="font-bold text-slate-700">Vehicle Info</TableHead>
                                            <TableHead className="font-bold text-slate-700">Type / Owner</TableHead>
                                            <TableHead className="font-bold text-slate-700">RC Expiry</TableHead>
                                            <TableHead className="font-bold text-slate-700">Status</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((v, i) => (
                                            <TableRow key={v.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-500 text-xs">
                                                    {startIndex + i + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-bold text-slate-900">{v.vehicle_no}</div>
                                                    <div className="text-xs text-slate-500">{v.brand_name} ({v.vehicle_body_type})</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium text-slate-900">{v.vehicle_type} - {v.vehicle_sub_type}</div>
                                                    <div className="text-xs text-slate-500">{v.own_dedicated}: {v.owner_name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                        {new Date(v.rc_expiry_date).toLocaleDateString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn(
                                                        "border-none",
                                                        v.status === 'Active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                    )}>
                                                        {v.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal('edit', v)} className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id, v.vehicle_no)} className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50">
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
                                    totalItems={vehicles.length}
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
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {modalMode === 'add' ? <Plus className="w-5 h-5 text-blue-600" /> : <Edit className="w-5 h-5 text-amber-600" />}
                            {modalMode === 'add' ? 'Register New Vehicle' : 'Edit Vehicle Details'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-8 py-4 px-1">
                        {/* Section: Basic Information */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Truck className="w-4 h-4" /> Basic Information
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vehicle_no" className="required">Vehicle Number</Label>
                                    <Input
                                        id="vehicle_no"
                                        value={formData.vehicle_no}
                                        onChange={e => setFormData({ ...formData, vehicle_no: e.target.value.toUpperCase() })}
                                        placeholder="e.g. TN01AB1234"
                                        className={cn(formErrors.vehicle_no && "border-red-500")}
                                    />
                                    {formErrors.vehicle_no && <p className="text-[10px] text-red-500">{formErrors.vehicle_no}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="required">Vehicle Type</Label>
                                    <Select value={formData.vehicle_type} onValueChange={val => setFormData({ ...formData, vehicle_type: val, vehicle_sub_type: '', vehicle_body_type: '' })}>
                                        <SelectTrigger className={cn(formErrors.vehicle_type && "border-red-500")}>
                                            <SelectValue placeholder="Select Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vehicleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {formErrors.vehicle_type && <p className="text-[10px] text-red-500">{formErrors.vehicle_type}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="required">Vehicle Sub Type</Label>
                                    <Select
                                        value={formData.vehicle_sub_type}
                                        onValueChange={val => setFormData({ ...formData, vehicle_sub_type: val, vehicle_body_type: '' })}
                                        disabled={!formData.vehicle_type}
                                    >
                                        <SelectTrigger className={cn(formErrors.vehicle_sub_type && "border-red-500")}>
                                            <SelectValue placeholder="Select Sub Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(subTypesMap[formData.vehicle_type] || []).map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {formErrors.vehicle_sub_type && <p className="text-[10px] text-red-500">{formErrors.vehicle_sub_type}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="required">Body Type</Label>
                                    <Select
                                        value={formData.vehicle_body_type}
                                        onValueChange={val => setFormData({ ...formData, vehicle_body_type: val })}
                                        disabled={!formData.vehicle_sub_type}
                                    >
                                        <SelectTrigger className={cn(formErrors.vehicle_body_type && "border-red-500")}>
                                            <SelectValue placeholder="Select Body Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(bodyTypesMap[formData.vehicle_sub_type] || []).map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {formErrors.vehicle_body_type && <p className="text-[10px] text-red-500">{formErrors.vehicle_body_type}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="brand_name" className="required">Brand Name</Label>
                                    <Input id="brand_name" value={formData.brand_name} onChange={e => setFormData({ ...formData, brand_name: e.target.value })} placeholder="e.g. Tata, Ashok Leyland" />
                                    {formErrors.brand_name && <p className="text-[10px] text-red-500">{formErrors.brand_name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="recommended_km" className="required">Recommended KM (One Side)</Label>
                                    <Input id="recommended_km" type="number" step="0.01" value={formData.recommended_km} onChange={e => setFormData({ ...formData, recommended_km: e.target.value })} placeholder="0.00" />
                                    {formErrors.recommended_km && <p className="text-[10px] text-red-500">{formErrors.recommended_km}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="required">Own / Dedicated</Label>
                                    <Select
                                        value={formData.own_dedicated}
                                        onValueChange={val => setFormData({ ...formData, own_dedicated: val, owner_name: '' })}
                                    >
                                        <SelectTrigger className={cn(formErrors.own_dedicated && "border-red-500")}>
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Own">Own</SelectItem>
                                            <SelectItem value="Dedicated">Dedicated</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {formErrors.own_dedicated && <p className="text-[10px] text-red-500">{formErrors.own_dedicated}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="required">Owner Name</Label>
                                    <Select
                                        value={formData.owner_name}
                                        onValueChange={val => setFormData({ ...formData, owner_name: val })}
                                    >
                                        <SelectTrigger className={cn(formErrors.owner_name && "border-red-500")}>
                                            <SelectValue placeholder="Select Owner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(ownersMap[formData.own_dedicated] || []).map(owner => <SelectItem key={owner} value={owner}>{owner}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {formErrors.owner_name && <p className="text-[10px] text-red-500">{formErrors.owner_name}</p>}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Section: Technical Details */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Settings className="w-4 h-4" /> Technical & RC Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="engine_no">Engine Number</Label>
                                    <Input id="engine_no" value={formData.engine_no} onChange={e => setFormData({ ...formData, engine_no: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="chasis_no">Chasis Number</Label>
                                    <Input id="chasis_no" value={formData.chasis_no} onChange={e => setFormData({ ...formData, chasis_no: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rc_expiry" className="required text-xs">RC Expiry Date</Label>
                                    <div className="relative">
                                        <Input id="rc_expiry" type="date" value={formData.rc_expiry_date} onChange={e => setFormData({ ...formData, rc_expiry_date: e.target.value })} />
                                    </div>
                                    {formErrors.rc_expiry_date && <p className="text-[10px] text-red-500">{formErrors.rc_expiry_date}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="required text-xs">RC Document</Label>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" size="sm" className="w-full flex items-center gap-2 text-xs">
                                            <Upload className="w-3 h-3" /> Upload
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Section: Statutory Documents */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Compliance Documents
                            </h4>

                            {/* Pollution */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                                <p className="text-xs font-bold text-slate-600">Pollution Details</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] required">Document Number</Label>
                                        <Input className="h-8 text-sm" value={formData.pollution_no} onChange={e => setFormData({ ...formData, pollution_no: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] required">Expiry Date</Label>
                                        <Input type="date" className="h-8 text-sm" value={formData.pollution_expiry_date} onChange={e => setFormData({ ...formData, pollution_expiry_date: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Action</Label>
                                        <Button type="button" variant="secondary" size="sm" className="w-full h-8 text-xs flex items-center gap-2">
                                            <Upload className="w-3 h-3" /> Upload
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Permit */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                                <p className="text-xs font-bold text-slate-600">Permit Details</p>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] required">Number</Label>
                                        <Input className="h-8 text-sm" value={formData.permit_no} onChange={e => setFormData({ ...formData, permit_no: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] required">Validity From</Label>
                                        <Input type="date" className="h-8 text-sm" value={formData.permit_from_date} onChange={e => setFormData({ ...formData, permit_from_date: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] required">Validity Till</Label>
                                        <Input type="date" className="h-8 text-sm" value={formData.permit_till_date} onChange={e => setFormData({ ...formData, permit_till_date: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Action</Label>
                                        <Button type="button" variant="secondary" size="sm" className="w-full h-8 text-xs flex items-center gap-2">
                                            <Upload className="w-3 h-3" /> Upload
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* FC */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                                <p className="text-xs font-bold text-slate-600">Fitness (FC) Details</p>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] required">Number</Label>
                                        <Input className="h-8 text-sm" value={formData.fc_no} onChange={e => setFormData({ ...formData, fc_no: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] required">Validity From</Label>
                                        <Input type="date" className="h-8 text-sm" value={formData.fc_from_date} onChange={e => setFormData({ ...formData, fc_from_date: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] required">Validity Till</Label>
                                        <Input type="date" className="h-8 text-sm" value={formData.fc_till_date} onChange={e => setFormData({ ...formData, fc_till_date: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Action</Label>
                                        <Button type="button" variant="secondary" size="sm" className="w-full h-8 text-xs flex items-center gap-2">
                                            <Upload className="w-3 h-3" /> Upload
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Section: Insurance */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" /> Insurance Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="insurance_no" className="required">Policy Number</Label>
                                    <Input id="insurance_no" value={formData.insurance_no} onChange={e => setFormData({ ...formData, insurance_no: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="base_value" className="required">Base Value</Label>
                                    <Input id="base_value" type="number" value={formData.insurance_base_value} onChange={e => setFormData({ ...formData, insurance_base_value: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gst_p">GST %</Label>
                                    <Input id="gst_p" type="number" value={formData.gst_percent} onChange={e => setFormData({ ...formData, gst_percent: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>GST Value</Label>
                                    <Input value={formData.gst_value} disabled className="bg-slate-50 font-semibold" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="required">Insurance Amount</Label>
                                    <Input value={formData.insurance_amount} disabled className="bg-slate-50 font-bold text-blue-600" />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button type="button" variant="outline" size="sm" className="flex items-center gap-2">
                                    <Upload className="w-3 h-3" /> Upload Policy Document
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        {/* Section: Status */}
                        <div className="flex items-center justify-between pb-4">
                            <div className="space-y-1">
                                <Label className="text-base font-bold text-slate-900">Vehicle Status</Label>
                                <p className="text-sm text-slate-500">Is this vehicle currently active in your fleet?</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={cn("text-sm font-bold", formData.status === 'Active' ? "text-green-600" : "text-red-600")}>
                                    {formData.status === 'Active' ? 'ACTIVE' : 'SOLD'}
                                </span>
                                <Switch
                                    checked={formData.status === 'Active'}
                                    onCheckedChange={checked => setFormData({ ...formData, status: checked ? 'Active' : 'Sold' })}
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-8 border-t border-slate-100 flex items-center justify-between">
                            <div className="text-[10px] text-slate-400 font-medium">
                                * Mandatory fields must be completed before saving.
                            </div>
                            <div className="flex gap-3">
                                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className={cn(
                                        "min-w-[150px] shadow-lg",
                                        modalMode === 'edit' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                                    )}
                                >
                                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {modalMode === 'add' ? 'Register Vehicle' : 'Save Changes'}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VehicleList;
