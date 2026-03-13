import React, { useEffect, useMemo, useState } from 'react';
import { cashbookPaymentAPI } from '../services/api';
import Pagination from './Pagination';
import {
    Plus,
    Eye,
    Edit,
    Trash2,
    SearchX,
    Loader2,
    Wallet,
    CalendarClock,
    Layers,
    Landmark
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
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { showConfirm } from '@/lib/dialogService';

const PAYMENT_CATEGORIES = ['Transactions', 'Advances and Loans', 'Masters'];
const REFERENCE_CATEGORIES = ['Cash', 'Bank'];
const REFERENCE_MODULES_BY_CATEGORY = {
    'Transactions': ['Driver Salary Payable', 'Dedicated Owner Payable'],
    'Advances and Loans': ['Due Settlement'],
    'Masters': ['Insurance']
};

const emptyForm = {
    payment_date: '',
    vehicle_id: '',
    payment_category: 'Transactions',
    reference_category: 'Cash',
    reference_module: '',
    reference_record_id: '',
    amount_paid: '',
    remarks: ''
};

const formatMoney = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0.00';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const CashbookPayments = () => {
    const [payments, setPayments] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [driverSalaryPayables, setDriverSalaryPayables] = useState([]);
    const [dedicatedOwnerPayables, setDedicatedOwnerPayables] = useState([]);
    const [dueSettlements, setDueSettlements] = useState([]);
    const [insuranceRecords, setInsuranceRecords] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [formData, setFormData] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const authUser = (() => { try { return JSON.parse(localStorage.getItem('auth_user') || '{}'); } catch { return {}; } })();

    const loadData = async () => {
        try {
            setLoading(true);
            const [metaRes, paymentsRes] = await Promise.all([
                cashbookPaymentAPI.getMeta(),
                cashbookPaymentAPI.getAll()
            ]);

            if (metaRes.success) {
                const meta = metaRes.data || {};
                setVehicles(meta.vehicles || []);
                setDriverSalaryPayables(meta.driver_salary_payables || []);
                setDedicatedOwnerPayables(meta.dedicated_owner_payables || []);
                setDueSettlements(meta.due_settlements || []);
                setInsuranceRecords(meta.insurance_records || []);
            }
            if (paymentsRes.success) {
                setPayments(paymentsRes.data || []);
            }
        } catch (err) {
            setError('Failed to load cashbook payments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const availableModules = REFERENCE_MODULES_BY_CATEGORY[formData.payment_category] || [];

    const referenceOptions = useMemo(() => {
        let options = [];
        if (formData.reference_module === 'Driver Salary Payable') {
            options = driverSalaryPayables.map((row) => ({
                id: row.id,
                amount: row.driver_salary_payable,
                label: `Driver ${row.driver_name || 'NA'} | Vehicles: ${row.vehicle_numbers || 'NA'} | Amount ${formatMoney(row.driver_salary_payable)}`
            }));
        } else if (formData.reference_module === 'Dedicated Owner Payable') {
            options = dedicatedOwnerPayables.map((row) => ({
                id: row.id,
                amount: row.settlement_balance,
                label: `Owner ${row.owner_name || 'NA'} | Vehicles: ${row.vehicle_numbers || 'NA'} | Amount ${formatMoney(row.settlement_balance)}`
            }));
        } else if (formData.reference_module === 'Due Settlement') {
            options = dueSettlements.map((row) => ({
                id: row.id,
                amount: row.due_amount,
                vehicle_id: row.vehicle_id,
                label: `Vehicle ${row.vehicle_number || 'NA'} | Inst ${row.installment_number || 'NA'} | Due ${row.due_date || 'NA'} | Amount ${formatMoney(row.due_amount)}`
            }));
        } else if (formData.reference_module === 'Insurance') {
            options = insuranceRecords.map((row) => ({
                id: row.id,
                amount: row.insurance_amount,
                vehicle_id: row.id,
                label: `Vehicle ${row.vehicle_no || 'NA'} | Policy ${row.insurance_no || 'NA'} | Amount ${formatMoney(row.insurance_amount)}`
            }));
        }

        const currentId = formData.reference_record_id;
        if (currentId && selectedPayment && !options.some(o => String(o.id) === String(currentId))) {
            options = [
                {
                    id: currentId,
                    amount: selectedPayment.reference_amount,
                    vehicle_id: selectedPayment.vehicle_id,
                    label: selectedPayment.reference_label || `Record ${currentId}`
                },
                ...options
            ];
        }
        return options;
    }, [
        formData.reference_module,
        formData.reference_record_id,
        driverSalaryPayables,
        dedicatedOwnerPayables,
        dueSettlements,
        insuranceRecords,
        selectedPayment
    ]);

    const selectedReference = useMemo(() => {
        return referenceOptions.find((opt) => String(opt.id) === String(formData.reference_record_id));
    }, [referenceOptions, formData.reference_record_id]);

    const referenceAmount = selectedReference?.amount ?? (
        selectedPayment && String(formData.reference_record_id || '') === String(selectedPayment.reference_record_id || '')
            ? selectedPayment.reference_amount
            : null
    );

    const filteredPayments = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return payments;
        return payments.filter((row) => (
            String(row.vehicle_number || '').toLowerCase().includes(q)
            || String(row.reference_module || '').toLowerCase().includes(q)
            || String(row.reference_label || '').toLowerCase().includes(q)
            || String(row.id || '').includes(q)
        ));
    }, [payments, search]);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

    const handleOpenModal = (mode, payment = null) => {
        setModalMode(mode);
        setSelectedPayment(payment);
        setFormErrors({});
        setError('');
        setSuccessMsg('');

        if (!payment || mode === 'add') {
            const today = new Date().toISOString().slice(0, 10);
            setFormData({ ...emptyForm, payment_date: today });
            setModalOpen(true);
            return;
        }

        setFormData({
            payment_date: payment.payment_date || '',
            vehicle_id: payment.vehicle_id ? String(payment.vehicle_id) : '',
            payment_category: payment.payment_category || 'Transactions',
            reference_category: payment.reference_category || 'Cash',
            reference_module: payment.reference_module || '',
            reference_record_id: payment.reference_record_id ? String(payment.reference_record_id) : '',
            amount_paid: payment.amount_paid != null ? String(payment.amount_paid) : '',
            remarks: payment.remarks || ''
        });
        setModalOpen(true);
    };

    const handleFieldChange = (field, value) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value };
            if (field === 'payment_category') {
                const modules = REFERENCE_MODULES_BY_CATEGORY[value] || [];
                if (!modules.includes(next.reference_module)) {
                    next.reference_module = '';
                    next.reference_record_id = '';
                }
            }
            if (field === 'reference_module') {
                next.reference_record_id = '';
            }
            return next;
        });
    };

    const handleReferenceSelect = (value) => {
        setFormData((prev) => {
            const next = { ...prev, reference_record_id: value };
            const ref = referenceOptions.find((opt) => String(opt.id) === String(value));
            if (ref) {
                if (!next.amount_paid) next.amount_paid = String(ref.amount ?? '');
                if (ref.vehicle_id) next.vehicle_id = String(ref.vehicle_id);
            }
            return next;
        });
    };

    const validate = () => {
        const errors = {};
        if (!formData.payment_date) errors.payment_date = 'Required';
        if (!formData.vehicle_id) errors.vehicle_id = 'Required';
        if (!formData.payment_category) errors.payment_category = 'Required';
        if (!formData.reference_category) errors.reference_category = 'Required';
        if (!formData.reference_module) errors.reference_module = 'Required';
        if (!formData.reference_record_id) errors.reference_record_id = 'Required';

        const amount = Number(formData.amount_paid);
        if (!Number.isFinite(amount) || amount <= 0) errors.amount_paid = 'Must be greater than 0';
        if (referenceAmount != null && Number.isFinite(amount) && amount > Number(referenceAmount)) {
            errors.amount_paid = 'Cannot exceed reference amount';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        const payload = {
            payment_date: formData.payment_date,
            vehicle_id: Number(formData.vehicle_id),
            payment_category: formData.payment_category,
            reference_category: formData.reference_category,
            reference_module: formData.reference_module,
            reference_record_id: Number(formData.reference_record_id),
            amount_paid: Number(formData.amount_paid),
            remarks: formData.remarks || null
        };

        try {
            setSubmitting(true);
            let res;
            if (modalMode === 'add') {
                res = await cashbookPaymentAPI.create({ ...payload, created_by: authUser.id });
            } else {
                res = await cashbookPaymentAPI.update(selectedPayment.id, payload);
            }

            if (res.success) {
                setSuccessMsg(`Payment ${modalMode === 'add' ? 'added' : 'updated'} successfully`);
                setModalOpen(false);
                await loadData();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save payment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (payment) => {
        const ok = await showConfirm({
            title: 'Delete Payment',
            message: `Delete payment record ${payment.id}?`,
            confirmLabel: 'Delete',
        });
        if (!ok) return;

        try {
            const res = await cashbookPaymentAPI.delete(payment.id);
            if (res.success) {
                setSuccessMsg('Payment deleted successfully');
                await loadData();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete payment');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <p className="text-base font-medium">Loading cashbook payments...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Wallet className="w-6 h-6 text-blue-600" />
                            Cashbook Payments
                        </CardTitle>
                        <p className="text-sm text-slate-500">Track cash and bank payments across modules</p>
                    </div>
                    <Button
                        onClick={() => handleOpenModal('add')}
                        className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Payment
                    </Button>
                </CardHeader>

                <CardContent className="pt-6 space-y-4">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium">
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-4 bg-green-50 border border-green-100 text-green-600 rounded-lg text-sm font-medium">
                            {successMsg}
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex-1">
                            <Input
                                placeholder="Search by vehicle, module, reference or ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {filteredPayments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <SearchX className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Payments Found</h3>
                            <p className="text-slate-500 mb-6">Start by recording a cashbook payment.</p>
                            <Button variant="outline" onClick={() => handleOpenModal('add')}>
                                Add Payment
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[70px] font-bold text-slate-700">S.No</TableHead>
                                            <TableHead className="font-bold text-slate-700">Payment ID</TableHead>
                                            <TableHead className="font-bold text-slate-700">Date</TableHead>
                                            <TableHead className="font-bold text-slate-700">Vehicle</TableHead>
                                            <TableHead className="font-bold text-slate-700">Category</TableHead>
                                            <TableHead className="font-bold text-slate-700">Reference</TableHead>
                                            <TableHead className="font-bold text-slate-700">Amount Paid</TableHead>
                                            <TableHead className="font-bold text-slate-700">Status</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((row, idx) => (
                                            <TableRow key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-500 text-xs">
                                                    {startIndex + idx + 1}
                                                </TableCell>
                                                <TableCell className="font-semibold text-slate-900">{row.id}</TableCell>
                                                <TableCell className="text-xs">{row.payment_date || '-'}</TableCell>
                                                <TableCell className="font-medium">{row.vehicle_number || '-'}</TableCell>
                                                <TableCell>
                                                    <div className="text-xs font-semibold text-slate-700">{row.payment_category}</div>
                                                    <div className="text-[10px] text-slate-500">{row.reference_category}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium text-slate-900">{row.reference_module}</div>
                                                    <div className="text-[10px] text-slate-500">{row.reference_label || `Record ${row.reference_record_id}`}</div>
                                                </TableCell>
                                                <TableCell className="font-semibold text-slate-900">{formatMoney(row.amount_paid)}</TableCell>
                                                <TableCell>
                                                    <Badge className={cn(
                                                        "border-none",
                                                        row.settlement_status === 'Settled'
                                                            ? "bg-green-100 text-green-700"
                                                            : row.settlement_status === 'Pending'
                                                                ? "bg-amber-100 text-amber-700"
                                                                : "bg-slate-100 text-slate-600"
                                                    )}>
                                                        {row.settlement_status || 'Unknown'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal('view', row)} className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal('edit', row)} className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(row)} className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50">
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
                                    totalItems={filteredPayments.length}
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
                <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {modalMode === 'add' ? <Plus className="w-5 h-5 text-blue-600" /> : modalMode === 'edit' ? <Edit className="w-5 h-5 text-amber-600" /> : <Eye className="w-5 h-5 text-blue-600" />}
                            {modalMode === 'add' ? 'Add Payment' : modalMode === 'edit' ? 'Edit Payment' : 'Payment Details'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-4 px-1">
                        <fieldset disabled={modalMode === 'view'} className="space-y-6">
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <CalendarClock className="w-3 h-3" /> Payment Details
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="required">Payment Date</Label>
                                        <Input
                                            type="date"
                                            value={formData.payment_date}
                                            onChange={(e) => handleFieldChange('payment_date', e.target.value)}
                                            className={cn(formErrors.payment_date && 'border-red-500')}
                                        />
                                        {formErrors.payment_date && <p className="text-[10px] text-red-500">{formErrors.payment_date}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="required">Vehicle Number</Label>
                                        <Select value={formData.vehicle_id} onValueChange={(v) => handleFieldChange('vehicle_id', v)}>
                                            <SelectTrigger className={cn(formErrors.vehicle_id && 'border-red-500')}>
                                                <SelectValue placeholder="Select vehicle" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vehicles.map((v) => (
                                                    <SelectItem key={v.id} value={String(v.id)}>
                                                        {v.vehicle_no}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {formErrors.vehicle_id && <p className="text-[10px] text-red-500">{formErrors.vehicle_id}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="required">Amount Paid</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.amount_paid}
                                            onChange={(e) => handleFieldChange('amount_paid', e.target.value)}
                                            className={cn(formErrors.amount_paid && 'border-red-500')}
                                        />
                                        {formErrors.amount_paid && <p className="text-[10px] text-red-500">{formErrors.amount_paid}</p>}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Layers className="w-3 h-3" /> Category & Reference
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="required">Payment Category</Label>
                                        <Select value={formData.payment_category} onValueChange={(v) => handleFieldChange('payment_category', v)}>
                                            <SelectTrigger className={cn(formErrors.payment_category && 'border-red-500')}>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PAYMENT_CATEGORIES.map((cat) => (
                                                    <SelectItem key={cat} value={cat}>
                                                        {cat}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {formErrors.payment_category && <p className="text-[10px] text-red-500">{formErrors.payment_category}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="required">Reference Category</Label>
                                        <Select value={formData.reference_category} onValueChange={(v) => handleFieldChange('reference_category', v)}>
                                            <SelectTrigger className={cn(formErrors.reference_category && 'border-red-500')}>
                                                <SelectValue placeholder="Select reference" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {REFERENCE_CATEGORIES.map((cat) => (
                                                    <SelectItem key={cat} value={cat}>
                                                        {cat}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {formErrors.reference_category && <p className="text-[10px] text-red-500">{formErrors.reference_category}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="required">Reference Module</Label>
                                        <Select value={formData.reference_module} onValueChange={(v) => handleFieldChange('reference_module', v)}>
                                            <SelectTrigger className={cn(formErrors.reference_module && 'border-red-500')}>
                                                <SelectValue placeholder="Select module" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableModules.map((module) => (
                                                    <SelectItem key={module} value={module}>
                                                        {module}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {formErrors.reference_module && <p className="text-[10px] text-red-500">{formErrors.reference_module}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="required">Reference Record</Label>
                                        <Select value={formData.reference_record_id} onValueChange={handleReferenceSelect} disabled={!formData.reference_module}>
                                            <SelectTrigger className={cn(formErrors.reference_record_id && 'border-red-500')}>
                                                <SelectValue placeholder={formData.reference_module ? 'Select reference record' : 'Select module first'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {referenceOptions.map((opt) => (
                                                    <SelectItem key={opt.id} value={String(opt.id)}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {formErrors.reference_record_id && <p className="text-[10px] text-red-500">{formErrors.reference_record_id}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Reference Amount</Label>
                                        <Input disabled className="bg-slate-50" value={referenceAmount != null ? formatMoney(referenceAmount) : ''} />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Landmark className="w-3 h-3" /> Notes
                                </h4>
                                <div className="space-y-2">
                                    <Label>Remarks</Label>
                                    <Textarea
                                        value={formData.remarks}
                                        onChange={(e) => handleFieldChange('remarks', e.target.value)}
                                        className="min-h-[80px]"
                                    />
                                </div>
                            </div>
                        </fieldset>

                        {modalMode === 'view' && selectedPayment && (
                            <>
                                <Separator />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div className="space-y-1">
                                        <Label>Payment ID</Label>
                                        <Input disabled className="bg-slate-50" value={selectedPayment.id} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Created At</Label>
                                        <Input disabled className="bg-slate-50" value={selectedPayment.created_at ? new Date(selectedPayment.created_at).toLocaleString() : ''} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Created By</Label>
                                        <Input disabled className="bg-slate-50" value={selectedPayment.created_by_name || selectedPayment.created_by || ''} />
                                    </div>
                                </div>
                            </>
                        )}

                        <DialogFooter className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
                                {modalMode === 'view' ? 'Close' : 'Cancel'}
                            </Button>
                            {modalMode !== 'view' && (
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className={cn(
                                        "min-w-[150px] shadow-lg",
                                        modalMode === 'edit' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                                    )}
                                >
                                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {modalMode === 'add' ? 'Add Payment' : 'Save Changes'}
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CashbookPayments;
