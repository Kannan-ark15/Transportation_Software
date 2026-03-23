import React, { useEffect, useMemo, useState } from 'react';
import { itcLedgerAPI } from '../services/api';
import Pagination from './Pagination';
import { showConfirm } from '@/lib/dialogService';
import {
    Plus,
    Loader2,
    SearchX,
    BookCheck,
    Trash2
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

const GST_REGEX = /^\d{2}[A-Z0-9]{10}[A-Z]\dZ[A-Z0-9]$/;

const DEFAULT_NOTES = [
    'All entries in the Purchase GST Tracker have been verified against the uploaded GSTR-2B data.',
    'Invoices that successfully matched (based on GSTIN, invoice number, and tax details) have been moved to the ITC Ledger and are now available for ITC utilisation.',
    'Invoices that did not match or showed discrepancies have been retained in the Purchase GST Tracker for review and follow-up.'
];

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
    vendor_gst_number: '',
    invoice_number: '',
    invoice_date: todayString(),
    purchase_amount: '',
    cgst: '',
    sgst: '',
    igst: ''
});

const ItcLedger = () => {
    const [entries, setEntries] = useState([]);
    const [notes, setNotes] = useState(DEFAULT_NOTES);

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
                itcLedgerAPI.getMeta(),
                itcLedgerAPI.getAll()
            ]);

            if (metaRes.success) {
                const apiNotes = metaRes.data?.notes;
                if (Array.isArray(apiNotes) && apiNotes.length > 0) {
                    setNotes(apiNotes);
                }
            }

            if (listRes.success) {
                setEntries(Array.isArray(listRes.data) ? listRes.data : []);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load ITC Ledger');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

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
            || String(row.invoice_number || '').toLowerCase().includes(q)
            || String(row.invoice_date || '').toLowerCase().includes(q)
            || formatDate(row.invoice_date).toLowerCase().includes(q)
        ));
    }, [entries, search]);

    const paginatedEntries = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredEntries, currentPage, itemsPerPage]);

    const handleFieldChange = (field, value) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value };
            if (field === 'vendor_gst_number') {
                next.vendor_gst_number = String(value || '').toUpperCase();
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

    const validate = () => {
        const errors = {};
        const today = todayString();

        if (!String(formData.vendor_name || '').trim()) errors.vendor_name = 'Required';

        const gst = String(formData.vendor_gst_number || '').trim().toUpperCase();
        if (!gst) {
            errors.vendor_gst_number = 'Required';
        } else if (!GST_REGEX.test(gst)) {
            errors.vendor_gst_number = 'Invalid GST format';
        }

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
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        if (!validate()) return;

        const payload = {
            vendor_name: String(formData.vendor_name || '').trim(),
            vendor_gst_number: String(formData.vendor_gst_number || '').trim().toUpperCase(),
            invoice_number: String(formData.invoice_number || '').trim(),
            invoice_date: formData.invoice_date,
            purchase_amount: toNumber(formData.purchase_amount, 0),
            cgst: toNumber(formData.cgst, 0),
            sgst: toNumber(formData.sgst, 0),
            igst: toNumber(formData.igst, 0),
            total_gst: computedTotals.totalGst,
            invoice_total: computedTotals.invoiceTotal,
            created_by: authUser.id || null
        };

        try {
            setSubmitting(true);
            setError('');
            setSuccessMsg('');

            const res = await itcLedgerAPI.create(payload);
            if (!res.success) {
                throw new Error('Failed to create ITC Ledger entry');
            }

            setEntries((prev) => [res.data, ...prev]);
            setFormData(buildEmptyForm());
            setFormErrors({});
            setSuccessMsg('ITC Ledger entry created successfully');
            setCurrentPage(1);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to create ITC Ledger entry');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (row) => {
        const ok = await showConfirm({
            title: 'Delete ITC Ledger Entry',
            message: `Delete entry for ${row.vendor_name} (${row.invoice_number})?`,
            confirmLabel: 'Delete',
        });
        if (!ok) return;

        try {
            setError('');
            const res = await itcLedgerAPI.delete(row.id);
            if (res.success) {
                setEntries((prev) => prev.filter((entry) => entry.id !== row.id));
                setSuccessMsg('ITC Ledger entry deleted successfully');
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete ITC Ledger entry');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[320px] text-slate-500">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <p className="text-base font-medium">Loading ITC Ledger...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="pb-5 border-b border-slate-100">
                    <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <BookCheck className="w-6 h-6 text-blue-600" />
                        ITC LEDGER (Import Table)
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                        Vendor and invoice-wise input GST entries for ITC utilisation.
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
                                <Label className="required">Vendor GST Number</Label>
                                <Input
                                    value={formData.vendor_gst_number}
                                    maxLength={15}
                                    onChange={(event) => handleFieldChange('vendor_gst_number', event.target.value)}
                                />
                                {formErrors.vendor_gst_number && <p className="text-[10px] text-red-500">{formErrors.vendor_gst_number}</p>}
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
                                <Label className="required">Purchase Amount</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={formData.purchase_amount}
                                    onChange={(event) => handleFieldChange('purchase_amount', event.target.value)}
                                />
                                {formErrors.purchase_amount && <p className="text-[10px] text-red-500">{formErrors.purchase_amount}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="required">CGST</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.cgst}
                                    onChange={(event) => handleTaxChange('cgst', event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="required">SGST</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.sgst}
                                    onChange={(event) => handleTaxChange('sgst', event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="required">IGST</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.igst}
                                    onChange={(event) => handleTaxChange('igst', event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="required">Total GST</Label>
                                <Input disabled className="bg-slate-50" value={formatMoney(computedTotals.totalGst)} />
                            </div>

                            <div className="space-y-2">
                                <Label className="required">Invoice Total</Label>
                                <Input disabled className="bg-slate-50" value={formatMoney(computedTotals.invoiceTotal)} />
                            </div>
                        </div>

                        {formErrors.tax && <p className="text-xs text-red-500">{formErrors.tax}</p>}

                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            Rule: If IGST is entered, CGST and SGST must be 0. If CGST or SGST is entered, IGST must be 0.
                            Total GST is auto-calculated as CGST + SGST + IGST and Invoice Total as Purchase Amount + Total GST.
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
                    <CardTitle className="text-xl font-bold text-slate-900">Home Page Fields</CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <Input
                            placeholder="Search by vendor name, invoice number or invoice date..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    {filteredEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <SearchX className="w-10 h-10 mb-3" />
                            <p className="text-sm">No ITC Ledger entries found</p>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/60">
                                        <TableRow>
                                            <TableHead>Vendor Name</TableHead>
                                            <TableHead>Vendor GST Number</TableHead>
                                            <TableHead>Invoice Number</TableHead>
                                            <TableHead>Invoice Date</TableHead>
                                            <TableHead>Total GST</TableHead>
                                            <TableHead>Invoice Total</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedEntries.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-semibold">{row.vendor_name || '-'}</TableCell>
                                                <TableCell>{row.vendor_gst_number || '-'}</TableCell>
                                                <TableCell>{row.invoice_number || '-'}</TableCell>
                                                <TableCell>{formatDate(row.invoice_date)}</TableCell>
                                                <TableCell>{formatMoney(row.total_gst)}</TableCell>
                                                <TableCell className="font-semibold">{formatMoney(row.invoice_total)}</TableCell>
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

                    <div className="rounded-md border border-blue-100 bg-blue-50/60 px-3 py-3 text-xs text-slate-700 space-y-2">
                        {notes.map((note, index) => (
                            <p key={index}>{note}</p>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ItcLedger;
