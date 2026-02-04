import React, { useState, useEffect } from 'react';
import DataToolbar from './common/DataToolbar';
import { rateCardAPI } from '../services/api';
import Pagination from './Pagination';
import {
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    SearchX,
    Loader2,
    Calculator,
    Truck,
    IndianRupee,
    ArrowRightLeft,
    CheckCircle2,
    AlertCircle,
    Settings
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
import { cn } from '@/lib/utils';

const RateCardList = () => {
    const [rateCards, setRateCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedRateCard, setSelectedRateCard] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        vehicle_type: '', vehicle_sub_type: '', vehicle_body_type: '',
        rcl_freight: '', kt_freight: '', driver_bata: '', advance: '',
        unloading: '', tarpaulin: '', city_tax: '', maintenance: ''
    });

    const [formErrors, setFormErrors] = useState({});

    // Dependent Options Data (Mirrored from VehicleList.jsx)
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

    useEffect(() => { loadRateCards(); }, []);

    // Auto-calculate KT Freight
    useEffect(() => {
        const rcl = parseFloat(formData.rcl_freight) || 0;
        if (rcl > 0) {
            const kt = Math.floor(rcl) - 1;
            setFormData(prev => ({ ...prev, kt_freight: kt.toString() }));
        } else {
            setFormData(prev => ({ ...prev, kt_freight: '' }));
        }
    }, [formData.rcl_freight]);

    const loadRateCards = async () => {
        try {
            setLoading(true);
            const res = await rateCardAPI.getAll();
            if (res.success) setRateCards(res.data);
        } catch (err) { setError('Failed to load rate cards'); }
        finally { setLoading(false); }
    };

    const handleImport = async (importedData) => {
        try {
            setLoading(true);
            let successCount = 0;
            let errors = [];

            for (const row of importedData) {
                const mappedData = {
                    vehicle_type: row['Vehicle Type'] || row['vehicle_type'],
                    vehicle_sub_type: row['Sub Type'] || row['vehicle_sub_type'],
                    vehicle_body_type: row['Body Type'] || row['vehicle_body_type'],
                    rcl_freight: row['RCL Freight'] || row['rcl_freight'],
                    kt_freight: row['KT Freight'] || row['kt_freight'],
                    driver_bata: row['Driver Bata'] || row['driver_bata'] || 0,
                    advance: row['Advance'] || row['advance'] || 0,
                    unloading: row['Unloading'] || row['unloading'] || 0,
                    tarpaulin: row['Tarpaulin'] || row['tarpaulin'] || 0,
                    city_tax: row['City Tax'] || row['city_tax'] || 0,
                    maintenance: row['Maintenance'] || row['maintenance'] || 0
                };

                // Validate mandatory fields
                if (!mappedData.vehicle_type || !mappedData.rcl_freight) continue;

                // Auto-calc KT if missing
                if (!mappedData.kt_freight) {
                    mappedData.kt_freight = (Math.floor(parseFloat(mappedData.rcl_freight)) - 1).toString();
                }

                try {
                    await rateCardAPI.create(mappedData);
                    successCount++;
                } catch (err) {
                    errors.push(`${mappedData.vehicle_type} - ${mappedData.vehicle_sub_type}`);
                }
            }

            setSuccessMsg(`Imported ${successCount} rate cards successfully.`);
            if (errors.length > 0) alert(`Failed to import: ${errors.join(', ')}`);
            loadRateCards();
        } catch (err) {
            setError('Import failed');
        } finally {
            setLoading(false);
        }
    };

    const exportColumns = [
        { header: 'Vehicle Type', dataKey: 'vehicle_type' },
        { header: 'Sub Type', dataKey: 'vehicle_sub_type' },
        { header: 'Body Type', dataKey: 'vehicle_body_type' },
        { header: 'RCL Freight', dataKey: 'rcl_freight' },
        { header: 'KT Freight', dataKey: 'kt_freight' },
        { header: 'Bata', dataKey: 'driver_bata' },
    ];

    const handleOpenModal = (mode, rateCard = null) => {
        setModalMode(mode);
        setSelectedRateCard(rateCard);
        setFormErrors({});
        if (rateCard) {
            setFormData({ ...rateCard });
        } else {
            setFormData({
                vehicle_type: '', vehicle_sub_type: '', vehicle_body_type: '',
                rcl_freight: '', kt_freight: '', driver_bata: '', advance: '',
                unloading: '', tarpaulin: '', city_tax: '', maintenance: ''
            });
        }
        setModalOpen(true);
    };

    const validate = () => {
        const errors = {};
        const mandatoryFields = ['vehicle_type', 'vehicle_sub_type', 'vehicle_body_type', 'rcl_freight', 'kt_freight'];

        mandatoryFields.forEach(field => {
            if (!formData[field] || String(formData[field]).trim() === '') {
                errors[field] = 'Required';
            }
        });

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setSubmitting(true);
            let res;
            if (modalMode === 'add') res = await rateCardAPI.create(formData);
            else res = await rateCardAPI.update(selectedRateCard.id, formData);

            if (res.success) {
                setSuccessMsg(`Rate card ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
                setModalOpen(false);
                loadRateCards();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Are you sure you want to delete this rate card?`)) return;
        try {
            const res = await rateCardAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Rate card deleted successfully');
                loadRateCards();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError('Failed to delete rate card'); }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = rateCards.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-lg font-medium">Loading rate cards...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Calculator className="w-6 h-6 text-blue-600" />
                            Rate Card Master
                        </CardTitle>
                        <p className="text-sm text-slate-500">Manage freight rates and standard driver expenses</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <DataToolbar
                            onImport={handleImport}
                            data={rateCards}
                            columns={exportColumns}
                            title="Rate Card Master Report"
                            fileName="rate_cards_list"
                        />
                        <Button
                            onClick={() => handleOpenModal('add')}
                            className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Rate Card
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

                    {rateCards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <SearchX className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Rate Cards Found</h3>
                            <p className="text-slate-500 mb-6">Start by creating standard freight rates for your vehicle types.</p>
                            <Button variant="outline" onClick={() => handleOpenModal('add')}>
                                Create Rate Card
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[80px] font-bold text-slate-700">S.No</TableHead>
                                            <TableHead className="font-bold text-slate-700">Vehicle Specification</TableHead>
                                            <TableHead className="font-bold text-slate-700">RCL Freight</TableHead>
                                            <TableHead className="font-bold text-slate-700">KT Freight</TableHead>
                                            <TableHead className="font-bold text-slate-700">Bata / Adv</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((r, i) => (
                                            <TableRow key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-500 text-xs">
                                                    {startIndex + i + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-bold text-slate-900">{r.vehicle_sub_type}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase font-medium">{r.vehicle_type} | {r.vehicle_body_type}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 font-semibold text-slate-900">
                                                        <IndianRupee className="w-3 h-3 text-slate-400" /> {parseFloat(r.rcl_freight).toLocaleString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 font-semibold text-blue-600">
                                                        <IndianRupee className="w-3 h-3 text-blue-400" /> {parseFloat(r.kt_freight).toLocaleString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs text-slate-600">B: ₹{r.driver_bata || 0}</div>
                                                    <div className="text-xs text-slate-600">A: ₹{r.advance || 0}</div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal('edit', r)} className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50">
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
                                    totalItems={rateCards.length}
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
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {modalMode === 'add' ? <Plus className="w-5 h-5 text-blue-600" /> : <Edit className="w-5 h-5 text-amber-600" />}
                            {modalMode === 'add' ? 'Create New Rate Card' : 'Edit Rate Card'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-8 py-4 px-1">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Truck className="w-3 h-3" /> Vehicle Application
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                </div>
                                <div className="space-y-2">
                                    <Label className="required">Sub Type</Label>
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
                                </div>
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
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <IndianRupee className="w-3 h-3" /> Freight Configuration
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                <div className="space-y-2 text-center md:text-left">
                                    <Label htmlFor="rcl_freight" className="required text-base font-bold text-slate-700">RCL Freight (₹)</Label>
                                    <Input
                                        id="rcl_freight"
                                        type="number"
                                        value={formData.rcl_freight}
                                        onChange={e => setFormData({ ...formData, rcl_freight: e.target.value })}
                                        placeholder="Enter manual rate"
                                        className={cn("h-12 text-lg font-bold text-center", formErrors.rcl_freight && "border-red-500")}
                                    />
                                    <p className="text-[10px] text-slate-400">Manual entry required in INR format</p>
                                </div>
                                <div className="flex flex-col items-center justify-center p-4 bg-blue-600 rounded-lg shadow-lg shadow-blue-100">
                                    <div className="flex items-center gap-2 text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">
                                        <ArrowRightLeft className="w-3 h-3" /> KT Freight (AUTO)
                                    </div>
                                    <span className="text-2xl font-black text-white">
                                        {formData.kt_freight ? `₹${formData.kt_freight}` : '--'}
                                    </span>
                                    <span className="text-[9px] text-blue-200 mt-1 opacity-75">Calculation: Floor(RCL) - 1</span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Settings className="w-3 h-3" /> Transaction Default Amounts (Optional)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold">Driver Bata</Label>
                                    <Input type="number" className="h-8 text-sm" value={formData.driver_bata} onChange={e => setFormData({ ...formData, driver_bata: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold">Standard Advance</Label>
                                    <Input type="number" className="h-8 text-sm" value={formData.advance} onChange={e => setFormData({ ...formData, advance: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold">Unloading</Label>
                                    <Input type="number" className="h-8 text-sm" value={formData.unloading} onChange={e => setFormData({ ...formData, unloading: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-500">Tarpaulin</Label>
                                    <Input type="number" className="h-8 text-sm" value={formData.tarpaulin} onChange={e => setFormData({ ...formData, tarpaulin: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-500">City Tax</Label>
                                    <Input type="number" className="h-8 text-sm" value={formData.city_tax} onChange={e => setFormData({ ...formData, city_tax: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-500">Maintenance</Label>
                                    <Input type="number" className="h-8 text-sm" value={formData.maintenance} onChange={e => setFormData({ ...formData, maintenance: e.target.value })} />
                                </div>
                                <div className="flex items-end text-[10px] text-slate-400 leading-tight italic px-1 pb-1">
                                    Reflected in Transaction: Loading Advance
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-8 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-full">
                                <AlertCircle className="w-3 h-3 text-blue-500" /> Changes affect new transactions only
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
                                    {modalMode === 'add' ? 'Create Rate Card' : 'Save Changes'}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RateCardList;
