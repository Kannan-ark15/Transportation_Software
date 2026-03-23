import React, { useEffect, useMemo, useState } from 'react';
import { purchaseGstTrackerAPI } from '../services/api';
import Pagination from './Pagination';
import { showConfirm } from '@/lib/dialogService';
import {
    Plus,
    Loader2,
    SearchX,
    ReceiptText,
    Trash2,
    Download,
    FileUp
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';

const GST_REGEX = /^\d{2}[A-Z0-9]{10}[A-Z]\dZ[A-Z0-9]$/;
const MAX_BILL_SIZE_BYTES = 5 * 1024 * 1024;

const todayString = () => new Date().toISOString().slice(0, 10);

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) => toNumber(value, 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB');
};

const buildEmptyForm = () => ({
    vendor_name: '',
    vendor_gst: '',
    reference_number: '',
    invoice_number: '',
    invoice_date: todayString(),
    expense_type: '',
    expense_sub_type: '',
    description: '',
    purchase_amount: '',
    cgst: '',
    sgst: '',
    igst: '',
    bill_document_name: '',
    bill_document_mime: '',
    bill_document_base64: ''
});

const PurchaseGstTracker = () => {
    const [entries, setEntries] = useState([]);
    const [expenseTypes, setExpenseTypes] = useState([]);
    const [subTypeMap, setSubTypeMap] = useState({});

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [formData, setFormData] = useState(buildEmptyForm());
    const [formErrors, setFormErrors] = useState({});

    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const authUser = (() => {
        try {
            return JSON.parse(localStorage.getItem('auth_user') || '{}');
        } catch {
            return {};
        }
    })();

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');

            const [metaRes, listRes] = await Promise.all([
                purchaseGstTrackerAPI.getMeta(),
                purchaseGstTrackerAPI.getAll()
            ]);

            if (metaRes.success) {
                const rows = metaRes.data?.expense_types || [];
                const nextMap = {};
                rows.forEach((row) => {
                    const type = row?.type;
                    if (!type) return;
                    nextMap[type] = Array.isArray(row.sub_types) ? row.sub_types : [];
                });
                setExpenseTypes(Object.keys(nextMap));
                setSubTypeMap(nextMap);
            }

            if (listRes.success) {
                setEntries(Array.isArray(listRes.data) ? listRes.data : []);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load purchase GST tracker');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const selectedSubTypes = useMemo(() => {
        return subTypeMap[formData.expense_type] || [];
    }, [subTypeMap, formData.expense_type]);

    const computedTotals = useMemo(() => {
        const purchaseAmount = toNumber(formData.purchase_amount, 0);
        const cgst = toNumber(formData.cgst, 0);
        const sgst = toNumber(formData.sgst, 0);
        const igst = toNumber(formData.igst, 0);
        const totalGst = Number((cgst + sgst + igst).toFixed(2));
        const invoiceTotal = Number((purchaseAmount + totalGst).toFixed(2));
        return { totalGst, invoiceTotal };
    }, [formData.purchase_amount, formData.cgst, formData.sgst, formData.igst]);

    const filteredEntries = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return entries;
        return entries.filter((row) => (
            String(row.vendor_name || '').toLowerCase().includes(q)
            || String(row.vendor_gst || '').toLowerCase().includes(q)
            || String(row.reference_number || '').toLowerCase().includes(q)
            || String(row.invoice_number || '').toLowerCase().includes(q)
            || String(row.expense_type || '').toLowerCase().includes(q)
            || String(row.expense_sub_type || '').toLowerCase().includes(q)
            || String(row.description || '').toLowerCase().includes(q)
        ));
    }, [entries, search]);

    const paginatedEntries = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredEntries, currentPage, itemsPerPage]);

    const handleFieldChange = (field, value) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value };
            if (field === 'vendor_gst') next.vendor_gst = String(value || '').toUpperCase();
            if (field === 'expense_type') {
                next.expense_sub_type = '';
            }
            return next;
        });
    };

    const handleTaxChange = (field, value) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value };
            const parsed = toNumber(value, 0);

            if (field === 'igst' && parsed > 0) {
                next.cgst = '0';
                next.sgst = '0';
            }
            if ((field === 'cgst' || field === 'sgst') && parsed > 0) {
                next.igst = '0';
            }

            return next;
        });
    };

    const clearUploadedBill = () => {
        setFormData((prev) => ({
            ...prev,
            bill_document_name: '',
            bill_document_mime: '',
            bill_document_base64: ''
        }));
    };

    const handleBillUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_BILL_SIZE_BYTES) {
            setError('Bill document size must be below 5 MB');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            setFormData((prev) => ({
                ...prev,
                bill_document_name: file.name,
                bill_document_mime: file.type || 'application/octet-stream',
                bill_document_base64: base64
            }));
        };
        reader.onerror = () => {
            setError('Failed to read uploaded document');
        };
        reader.readAsDataURL(file);
    };

    const validate = () => {
        const errors = {};
        const today = todayString();

        if (!String(formData.vendor_name || '').trim()) errors.vendor_name = 'Required';

        const gst = String(formData.vendor_gst || '').trim().toUpperCase();
        if (!gst) {
            errors.vendor_gst = 'Required';
        } else if (!GST_REGEX.test(gst)) {
            errors.vendor_gst = 'Invalid GST format';
        }

        if (!String(formData.reference_number || '').trim()) errors.reference_number = 'Required';

        const invoiceNumber = String(formData.invoice_number || '').trim();
        if (!invoiceNumber) {
            errors.invoice_number = 'Required';
        } else if (!/^\d+$/.test(invoiceNumber)) {
            errors.invoice_number = 'Must be numeric';
        }

        if (!formData.invoice_date) {
            errors.invoice_date = 'Required';
        } else if (formData.invoice_date > today) {
            errors.invoice_date = 'Future date is not allowed';
        }

        if (!formData.expense_type) errors.expense_type = 'Required';
        if (!formData.expense_sub_type) errors.expense_sub_type = 'Required';
        if (!String(formData.description || '').trim()) errors.description = 'Required';

        const purchaseAmount = toNumber(formData.purchase_amount, NaN);
        if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
            errors.purchase_amount = 'Must be greater than 0';
        }

        const cgst = toNumber(formData.cgst, 0);
        const sgst = toNumber(formData.sgst, 0);
        const igst = toNumber(formData.igst, 0);

        if (cgst < 0 || sgst < 0 || igst < 0) {
            errors.tax = 'CGST, SGST and IGST cannot be negative';
        } else if (igst > 0 && (cgst > 0 || sgst > 0)) {
            errors.tax = 'If IGST is entered, CGST and SGST must be 0';
        } else if (igst <= 0 && (cgst <= 0 || sgst <= 0)) {
            errors.tax = 'Enter IGST, or enter both CGST and SGST for intra-state purchase';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        if (!validate()) return;

        const payload = {
            vendor_name: String(formData.vendor_name || '').trim(),
            vendor_gst: String(formData.vendor_gst || '').trim().toUpperCase(),
            reference_number: String(formData.reference_number || '').trim(),
            invoice_number: String(formData.invoice_number || '').trim(),
            invoice_date: formData.invoice_date,
            expense_type: formData.expense_type,
            expense_sub_type: formData.expense_sub_type,
            description: String(formData.description || '').trim(),
            purchase_amount: toNumber(formData.purchase_amount, 0),
            cgst: toNumber(formData.cgst, 0),
            sgst: toNumber(formData.sgst, 0),
            igst: toNumber(formData.igst, 0),
            total_gst: computedTotals.totalGst,
            invoice_total: computedTotals.invoiceTotal,
            bill_document_name: formData.bill_document_name || null,
            bill_document_mime: formData.bill_document_mime || null,
            bill_document_base64: formData.bill_document_base64 || null,
            created_by: authUser.id || null
        };

        try {
            setSubmitting(true);
            setError('');
            setSuccessMsg('');

            const res = await purchaseGstTrackerAPI.create(payload);
            if (!res.success) {
                throw new Error('Failed to create purchase GST entry');
            }

            const created = res.data;
            setEntries((prev) => [created, ...prev]);
            setFormData(buildEmptyForm());
            setFormErrors({});
            setSuccessMsg('Purchase GST entry created successfully');
            setCurrentPage(1);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to create purchase GST entry');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (row) => {
        const ok = await showConfirm({
            title: 'Delete Purchase GST Entry',
            message: `Delete entry for ${row.vendor_name} (${row.invoice_number})?`,
            confirmLabel: 'Delete',
        });
        if (!ok) return;

        try {
            setError('');
            const res = await purchaseGstTrackerAPI.delete(row.id);
            if (res.success) {
                setEntries((prev) => prev.filter((entry) => entry.id !== row.id));
                setSuccessMsg('Purchase GST entry deleted successfully');
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete purchase GST entry');
        }
    };

    const handleDownloadBill = async (row) => {
        try {
            setError('');
            const res = await purchaseGstTrackerAPI.getById(row.id);
            if (!res.success) throw new Error('Failed to load bill document');

            const data = res.data || {};
            const base64 = data.bill_document_base64;
            if (!base64) {
                setError('No bill document available for this entry');
                return;
            }

            const mime = data.bill_document_mime || 'application/octet-stream';
            const name = data.bill_document_name || `purchase_bill_${row.id}`;
            const link = document.createElement('a');
            link.href = `data:${mime};base64,${base64}`;
            link.download = name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to download bill document');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[320px] text-slate-500">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <p className="text-base font-medium">Loading purchase GST tracker...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="pb-5 border-b border-slate-100">
                    <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ReceiptText className="w-6 h-6 text-blue-600" />
                        Purchase GST Tracker (Input GST)
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                        Track purchase invoices with intra-state (CGST+SGST) or interstate (IGST) tax rules.
                    </p>
                </CardHeader>

                <CardContent className="pt-6 space-y-4">
                    {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-md text-sm">{error}</div>}
                    {successMsg && <div className="p-3 bg-green-50 border border-green-100 text-green-600 rounded-md text-sm">{successMsg}</div>}

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="required">Vendor Name</Label>
                                <Input
                                    value={formData.vendor_name}
                                    onChange={(event) => handleFieldChange('vendor_name', event.target.value)}
                                />
                                {formErrors.vendor_name && <p className="text-[10px] text-red-500">{formErrors.vendor_name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="required">Vendor GST</Label>
                                <Input
                                    value={formData.vendor_gst}
                                    maxLength={15}
                                    onChange={(event) => handleFieldChange('vendor_gst', event.target.value)}
                                />
                                {formErrors.vendor_gst && <p className="text-[10px] text-red-500">{formErrors.vendor_gst}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="required">Number</Label>
                                <Input
                                    value={formData.reference_number}
                                    onChange={(event) => handleFieldChange('reference_number', event.target.value)}
                                />
                                {formErrors.reference_number && <p className="text-[10px] text-red-500">{formErrors.reference_number}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="required">Invoice Number</Label>
                                <Input
                                    value={formData.invoice_number}
                                    onChange={(event) => handleFieldChange('invoice_number', event.target.value)}
                                />
                                {formErrors.invoice_number && <p className="text-[10px] text-red-500">{formErrors.invoice_number}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="required">Invoice Date</Label>
                                <Input
                                    type="date"
                                    max={todayString()}
                                    value={formData.invoice_date}
                                    onChange={(event) => handleFieldChange('invoice_date', event.target.value)}
                                />
                                {formErrors.invoice_date && <p className="text-[10px] text-red-500">{formErrors.invoice_date}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="required">Expense Type</Label>
                                <Select value={formData.expense_type} onValueChange={(value) => handleFieldChange('expense_type', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select expense type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {expenseTypes.map((type) => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {formErrors.expense_type && <p className="text-[10px] text-red-500">{formErrors.expense_type}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="required">Expense Sub Type</Label>
                                <Select
                                    value={formData.expense_sub_type}
                                    onValueChange={(value) => handleFieldChange('expense_sub_type', value)}
                                    disabled={!formData.expense_type}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={formData.expense_type ? 'Select sub type' : 'Select expense type first'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectedSubTypes.map((type) => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {formErrors.expense_sub_type && <p className="text-[10px] text-red-500">{formErrors.expense_sub_type}</p>}
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label className="required">Description</Label>
                                <Textarea
                                    className="min-h-[80px]"
                                    value={formData.description}
                                    onChange={(event) => handleFieldChange('description', event.target.value)}
                                />
                                {formErrors.description && <p className="text-[10px] text-red-500">{formErrors.description}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="required">Purchase Amount</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.purchase_amount}
                                    onChange={(event) => handleFieldChange('purchase_amount', event.target.value)}
                                />
                                {formErrors.purchase_amount && <p className="text-[10px] text-red-500">{formErrors.purchase_amount}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>CGST</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.cgst}
                                    onChange={(event) => handleTaxChange('cgst', event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>SGST</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.sgst}
                                    onChange={(event) => handleTaxChange('sgst', event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>IGST</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.igst}
                                    onChange={(event) => handleTaxChange('igst', event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Total GST</Label>
                                <Input disabled className="bg-slate-50" value={formatMoney(computedTotals.totalGst)} />
                            </div>

                            <div className="space-y-2">
                                <Label>Invoice Total</Label>
                                <Input disabled className="bg-slate-50" value={formatMoney(computedTotals.invoiceTotal)} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Upload Bill</Label>
                                <div className="flex flex-col md:flex-row md:items-center gap-2">
                                    <Input type="file" onChange={handleBillUpload} />
                                    {formData.bill_document_name && (
                                        <Button type="button" variant="outline" onClick={clearUploadedBill}>
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                {formData.bill_document_name && (
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <FileUp className="w-3.5 h-3.5" />
                                        {formData.bill_document_name}
                                    </p>
                                )}
                            </div>
                        </div>

                        {formErrors.tax && <p className="text-xs text-red-500">{formErrors.tax}</p>}

                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            Rule: If IGST is entered, CGST and SGST must be 0. For intra-state purchase, enter both CGST and SGST.
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                Add Entry
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setFormData(buildEmptyForm());
                                    setFormErrors({});
                                }}
                            >
                                Reset
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-none shadow-md">
                <CardHeader className="pb-5 border-b border-slate-100">
                    <CardTitle className="text-xl font-bold text-slate-900">Entries</CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <Input
                            placeholder="Search by vendor, GST, number, invoice or expense..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    {filteredEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <SearchX className="w-10 h-10 mb-3" />
                            <p className="text-sm">No purchase GST entries found</p>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/60">
                                        <TableRow>
                                            <TableHead>Vendor</TableHead>
                                            <TableHead>Vendor GST</TableHead>
                                            <TableHead>Number</TableHead>
                                            <TableHead>Invoice No</TableHead>
                                            <TableHead>Invoice Date</TableHead>
                                            <TableHead>Expense Type</TableHead>
                                            <TableHead>Purchase Amount</TableHead>
                                            <TableHead>Total GST</TableHead>
                                            <TableHead>Invoice Total</TableHead>
                                            <TableHead>Bill</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedEntries.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-semibold">{row.vendor_name || '-'}</TableCell>
                                                <TableCell>{row.vendor_gst || '-'}</TableCell>
                                                <TableCell>{row.reference_number || '-'}</TableCell>
                                                <TableCell>{row.invoice_number || '-'}</TableCell>
                                                <TableCell>{formatDate(row.invoice_date)}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium">{row.expense_type || '-'}</div>
                                                    <div className="text-[10px] text-slate-500">{row.expense_sub_type || '-'}</div>
                                                </TableCell>
                                                <TableCell>{formatMoney(row.purchase_amount)}</TableCell>
                                                <TableCell>{formatMoney(row.total_gst)}</TableCell>
                                                <TableCell className="font-semibold">{formatMoney(row.invoice_total)}</TableCell>
                                                <TableCell>
                                                    {row.has_bill ? (
                                                        <Button variant="outline" size="sm" onClick={() => handleDownloadBill(row)}>
                                                            <Download className="w-4 h-4 mr-1" /> Download
                                                        </Button>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(row)}>
                                                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <Pagination
                                currentPage={currentPage}
                                totalItems={filteredEntries.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={setItemsPerPage}
                            />
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default PurchaseGstTracker;
