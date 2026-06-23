import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { stationAPI } from '../services/api';
import {
    CalendarDays,
    Edit,
    Fuel,
    Gauge,
    IndianRupee,
    Loader2,
    Plus,
    SearchX,
    Trash2,
    Warehouse
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { showConfirm } from '@/lib/dialogService';

const tabs = [
    { key: 'products', label: 'Product Set-up', icon: Fuel, idField: 'product_id' },
    { key: 'tanks', label: 'Tank Set-up', icon: Warehouse, idField: 'tank_id' },
    { key: 'dispensers', label: 'Dispenser Set-up', icon: Gauge, idField: 'dispenser_id' },
    { key: 'nozzles', label: 'Nozzle Set-up', icon: Fuel, idField: 'nozzle_id' },
    { key: 'rates', label: 'Rate Set-up', icon: IndianRupee, idField: 'rate_id' },
];

const blankForms = {
    products: { product_name: '', product_code: '', status: true },
    tanks: { tank_id: '', product_code: '', product_id: '', capacity: '', status: true },
    dispensers: { dispenser_no: '', status: true },
    nozzles: { nozzle_id: '', dispenser_no: '', tank_id: '', product_code: '', nozzle_position: 'A', status: true },
    rates: { effective_date: new Date().toISOString().slice(0, 10), product_code: '', rate: '' },
};

const columns = {
    products: [
        ['product_id', 'Product ID'], ['product_name', 'Product Name'], ['product_code', 'Code'], ['status', 'Status']
    ],
    tanks: [
        ['tank_id', 'Tank ID'], ['product_code', 'Product'], ['product_id', 'Product ID'], ['capacity', 'Capacity'], ['status', 'Status']
    ],
    dispensers: [
        ['dispenser_id', 'Dispenser ID'], ['dispenser_no', 'Dispenser No'], ['status', 'Status']
    ],
    nozzles: [
        ['nozzle_id', 'Nozzle ID'], ['dispenser_no', 'Dispenser'], ['tank_id', 'Tank'], ['product_code', 'Product'], ['status', 'Status']
    ],
    rates: [
        ['rate_id', 'Rate ID'], ['effective_date', 'Effective Date'], ['product_code', 'Product'], ['rate', 'Rate']
    ],
};

const titles = {
    products: 'station product',
    tanks: 'tank',
    dispensers: 'dispenser',
    nozzles: 'nozzle',
    rates: 'fuel rate',
};

const formatDate = (value) => value ? String(value).slice(0, 10) : '-';
const isKnownTab = (tab) => tabs.some((item) => item.key === tab);

const StationModule = () => {
    const params = useParams();
    const navigate = useNavigate();
    const routeTab = isKnownTab(params.tab) ? params.tab : 'products';

    const [activeTab, setActiveTab] = useState(routeTab);
    const [records, setRecords] = useState({ products: [], tanks: [], dispensers: [], nozzles: [], rates: [] });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [formData, setFormData] = useState(blankForms.products);
    const [rateDate, setRateDate] = useState(new Date().toISOString().slice(0, 10));
    const [activeRates, setActiveRates] = useState([]);

    useEffect(() => {
        if (routeTab !== activeTab) setActiveTab(routeTab);
    }, [routeTab, activeTab]);

    const loadAll = async () => {
        try {
            setLoading(true);
            setError('');
            const [products, tanks, dispensers, nozzles, rates, activeRateRes] = await Promise.all([
                stationAPI.products.getAll(),
                stationAPI.tanks.getAll(),
                stationAPI.dispensers.getAll(),
                stationAPI.nozzles.getAll(),
                stationAPI.rates.getAll(),
                stationAPI.getActiveRates(rateDate),
            ]);
            setRecords({
                products: products.data || [],
                tanks: tanks.data || [],
                dispensers: dispensers.data || [],
                nozzles: nozzles.data || [],
                rates: rates.data || [],
            });
            setActiveRates(activeRateRes.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load station data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAll(); }, []);

    const productByCode = useMemo(() => Object.fromEntries(records.products.map((p) => [p.product_code, p])), [records.products]);
    const dispenserByNo = useMemo(() => Object.fromEntries(records.dispensers.map((d) => [d.dispenser_no, d])), [records.dispensers]);

    const changeTab = (key) => {
        setActiveTab(key);
        navigate(`/station/${key}`);
    };

    const reloadActiveRates = async (date = rateDate) => {
        try {
            const res = await stationAPI.getActiveRates(date);
            setActiveRates(res.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load active rates');
        }
    };

    const getProductName = (code) => productByCode[code]?.product_name || code || '-';

    const generateNozzleId = (nextForm) => {
        const dispenser = dispenserByNo[nextForm.dispenser_no];
        const prefix = dispenser?.dispenser_id || nextForm.dispenser_no;
        if (!prefix || !nextForm.product_code || !nextForm.nozzle_position) return nextForm.nozzle_id || '';
        return `${prefix}${nextForm.product_code}${nextForm.nozzle_position}`.replace(/\s+/g, '').toUpperCase();
    };

    const openModal = (mode, record = null) => {
        setModalMode(mode);
        setSelectedRecord(record);
        const next = record
            ? { ...blankForms[activeTab], ...record, effective_date: formatDate(record.effective_date) }
            : { ...blankForms[activeTab] };
        setFormData(next);
        setModalOpen(true);
    };

    const updateForm = (field, value) => {
        setFormData((current) => {
            const next = { ...current, [field]: value };
            if (activeTab === 'tanks' && field === 'product_code') {
                next.product_id = productByCode[value]?.product_id || '';
            }
            if (activeTab === 'nozzles' && modalMode === 'add') {
                next.nozzle_id = generateNozzleId(next);
            }
            return next;
        });
    };

    const payloadForSubmit = () => {
        if (activeTab === 'tanks') {
            return { ...formData, product_id: productByCode[formData.product_code]?.product_id || formData.product_id };
        }
        if (activeTab === 'nozzles') {
            const { nozzle_position, ...payload } = formData;
            return payload;
        }
        return formData;
    };

    const submitForm = async (event) => {
        event.preventDefault();
        try {
            setSubmitting(true);
            setError('');
            const apiForTab = stationAPI[activeTab];
            const idField = tabs.find((tab) => tab.key === activeTab).idField;
            const payload = payloadForSubmit();
            const res = modalMode === 'add'
                ? await apiForTab.create(payload)
                : await apiForTab.update(selectedRecord[idField], payload);
            if (res.success) {
                setSuccessMsg(`${titles[activeTab]} ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
                setModalOpen(false);
                await loadAll();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const deleteRecord = async (record) => {
        const idField = tabs.find((tab) => tab.key === activeTab).idField;
        const ok = await showConfirm({
            title: `Delete ${titles[activeTab]}`,
            message: `Are you sure you want to delete ${record[idField]}?`,
            confirmLabel: 'Delete',
        });
        if (!ok) return;
        try {
            const res = await stationAPI[activeTab].delete(record[idField]);
            if (res.success) {
                setSuccessMsg(`${titles[activeTab]} deleted successfully`);
                await loadAll();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Delete failed');
        }
    };

    const toggleStatus = async (record, status) => {
        const idField = tabs.find((tab) => tab.key === activeTab).idField;
        try {
            await stationAPI[activeTab].updateStatus(record[idField], status);
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Status update failed');
        }
    };

    const renderCell = (record, key) => {
        if (key === 'status') {
            return (
                <div className="flex items-center gap-2">
                    <Switch checked={Boolean(record.status)} onCheckedChange={(checked) => toggleStatus(record, checked)} />
                    <Badge className={record.status ? 'bg-green-50 text-green-700 border-none' : 'bg-slate-100 text-slate-500 border-none'}>
                        {record.status ? 'Active' : 'Inactive'}
                    </Badge>
                </div>
            );
        }
        if (key === 'effective_date') return formatDate(record[key]);
        if (key === 'rate') return record[key] ? `₹ ${record[key]}` : '-';
        if (key === 'capacity') return record[key] ? `${record[key]} L` : '-';
        if (key === 'product_code') return getProductName(record[key]);
        return record[key] || '-';
    };

    const renderProductSelect = (value, onChange, disabled = false) => (
        <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
            <SelectContent>
                {records.products.map((product) => (
                    <SelectItem key={product.product_code} value={product.product_code}>
                        {product.product_name} ({product.product_code})
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    const renderForm = () => {
        const disabledId = modalMode === 'edit';
        if (activeTab === 'products') return (
            <div className="grid grid-cols-2 gap-4">
                <Field label="Product Name" id="product_name" value={formData.product_name} onChange={(value) => updateForm('product_name', value)} required />
                <Field label="Product Code" id="product_code" value={formData.product_code} onChange={(value) => updateForm('product_code', value.toUpperCase())} required disabled={disabledId} />
            </div>
        );
        if (activeTab === 'tanks') return (
            <div className="grid grid-cols-2 gap-4">
                <Field label="Tank ID" id="tank_id" value={formData.tank_id} onChange={(value) => updateForm('tank_id', value.toUpperCase())} required disabled={disabledId} />
                <div className="space-y-2"><Label className="required">Product</Label>{renderProductSelect(formData.product_code, (value) => updateForm('product_code', value))}</div>
                <Field label="Product ID" id="product_id" value={formData.product_id} onChange={(value) => updateForm('product_id', value)} disabled />
                <Field label="Capacity (L)" id="capacity" type="number" step="0.01" value={formData.capacity} onChange={(value) => updateForm('capacity', value)} required />
            </div>
        );
        if (activeTab === 'dispensers') return (
            <Field label="Dispenser No" id="dispenser_no" value={formData.dispenser_no} onChange={(value) => updateForm('dispenser_no', value.toUpperCase())} required disabled={disabledId} />
        );
        if (activeTab === 'nozzles') return (
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="required">Dispenser</Label><Select value={formData.dispenser_no || undefined} onValueChange={(value) => updateForm('dispenser_no', value)}><SelectTrigger><SelectValue placeholder="Select dispenser" /></SelectTrigger><SelectContent>{records.dispensers.map((d) => <SelectItem key={d.dispenser_no} value={d.dispenser_no}>{d.dispenser_no} ({d.dispenser_id})</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label className="required">Product</Label>{renderProductSelect(formData.product_code, (value) => updateForm('product_code', value))}</div>
                <div className="space-y-2"><Label className="required">Tank</Label><Select value={formData.tank_id || undefined} onValueChange={(value) => updateForm('tank_id', value)}><SelectTrigger><SelectValue placeholder="Select tank" /></SelectTrigger><SelectContent>{records.tanks.filter((tank) => !formData.product_code || tank.product_code === formData.product_code).map((tank) => <SelectItem key={tank.tank_id} value={tank.tank_id}>{tank.tank_id} ({getProductName(tank.product_code)})</SelectItem>)}</SelectContent></Select></div>
                <Field label="Nozzle Position" id="nozzle_position" value={formData.nozzle_position} onChange={(value) => updateForm('nozzle_position', value.toUpperCase())} disabled={modalMode === 'edit'} required />
                <Field label="Nozzle ID" id="nozzle_id" value={formData.nozzle_id} onChange={(value) => updateForm('nozzle_id', value.toUpperCase())} disabled={disabledId} required />
            </div>
        );
        return (
            <div className="grid grid-cols-2 gap-4">
                <Field label="Effective Date" id="effective_date" type="date" value={formData.effective_date} onChange={(value) => updateForm('effective_date', value)} required />
                <div className="space-y-2"><Label className="required">Product</Label>{renderProductSelect(formData.product_code, (value) => updateForm('product_code', value), disabledId)}</div>
                <Field label="Rate" id="rate" type="number" step="0.01" value={formData.rate} onChange={(value) => updateForm('rate', value)} required />
            </div>
        );
    };

    const currentTab = tabs.find((tab) => tab.key === activeTab);
    const Icon = currentTab.icon;
    const tabRecords = records[activeTab] || [];

    if (loading) {
        return <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" /><p className="text-lg font-medium">Loading station setup...</p></div>;
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="border-b border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Fuel className="w-6 h-6 text-blue-600" />Station Module</CardTitle>
                            <p className="text-sm text-slate-500">Manage products, tanks, dispensers, nozzles, and daily rates</p>
                        </div>
                        <Button onClick={() => openModal('add')} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"><Plus className="w-4 h-4 mr-2" />Add {titles[activeTab]}</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {tabs.map((tab) => {
                            const TabIcon = tab.icon;
                            return <Button key={tab.key} type="button" variant="outline" onClick={() => changeTab(tab.key)} className={cn('rounded-full', activeTab === tab.key && 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white')}><TabIcon className="w-4 h-4 mr-2" />{tab.label}</Button>;
                        })}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {error && <div className="mb-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium">{error}</div>}
                    {successMsg && <div className="mb-4 p-4 bg-green-50 border border-green-100 text-green-600 rounded-lg text-sm font-medium">{successMsg}</div>}

                    {activeTab === 'rates' && (
                        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                            <div className="flex items-end gap-3 mb-4">
                                <div className="space-y-2"><Label>Active rates as of</Label><Input type="date" value={rateDate} onChange={(e) => { setRateDate(e.target.value); reloadActiveRates(e.target.value); }} /></div>
                                <Badge className="bg-blue-600 text-white border-none mb-2"><CalendarDays className="w-3 h-3 mr-1" />Latest on or before date</Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {activeRates.map((rate) => <div key={rate.product_code} className="rounded-xl bg-white p-3 border border-blue-100"><p className="text-sm font-semibold text-slate-900">{rate.product_name}</p><p className="text-lg font-bold text-blue-700">{rate.rate ? `₹ ${rate.rate}` : 'No rate'}</p><p className="text-xs text-slate-500">Effective: {formatDate(rate.effective_date)}</p></div>)}
                            </div>
                        </div>
                    )}

                    {tabRecords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400"><SearchX className="w-12 h-12 text-slate-300 mb-4" /><h3 className="text-lg font-semibold text-slate-900 mb-1">No records found</h3><p className="text-slate-500 mb-6">Start by adding the first {titles[activeTab]}.</p><Button variant="outline" onClick={() => openModal('add')}>Add {titles[activeTab]}</Button></div>
                    ) : (
                        <div className="rounded-md border border-slate-100 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/50"><TableRow>{columns[activeTab].map(([, label]) => <TableHead key={label} className="font-bold text-slate-700">{label}</TableHead>)}<TableHead className="text-right font-bold text-slate-700">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>{tabRecords.map((record) => <TableRow key={record[currentTab.idField]} className="hover:bg-slate-50/50 transition-colors">{columns[activeTab].map(([key]) => <TableCell key={key}>{renderCell(record, key)}</TableCell>)}<TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openModal('edit', record)} className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => deleteRecord(record)} className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}</TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Icon className="w-5 h-5 text-blue-600" />{modalMode === 'add' ? 'Add' : 'Edit'} {currentTab.label}</DialogTitle></DialogHeader>
                    <form onSubmit={submitForm} className="space-y-6 py-4">
                        {renderForm()}
                        {activeTab !== 'rates' && <div className="flex items-center gap-3"><Switch checked={Boolean(formData.status)} onCheckedChange={(checked) => updateForm('status', checked)} /><Label>Status: {formData.status ? 'Active' : 'Inactive'}</Label></div>}
                        <DialogFooter className="pt-4 border-t border-slate-100"><Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button><Button type="submit" disabled={submitting} className={modalMode === 'edit' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{modalMode === 'add' ? 'Save' : 'Update'}</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const Field = ({ label, id, value, onChange, type = 'text', step, required = false, disabled = false }) => (
    <div className="space-y-2">
        <Label htmlFor={id} className={required ? 'required' : ''}>{label}</Label>
        <Input id={id} type={type} step={step} value={value || ''} onChange={(event) => onChange(event.target.value)} required={required} disabled={disabled} />
    </div>
);

export default StationModule;
