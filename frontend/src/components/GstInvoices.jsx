import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { gstInvoiceAPI } from '../services/api';
import Pagination from './Pagination';
import {
    Plus,
    Loader2,
    SearchX,
    FileText,
    Trash2,
    ReceiptText,
    Building2,
    CalendarDays
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
    SelectValue,
} from '@/components/ui/select';
import { showConfirm } from '@/lib/dialogService';

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

const buildAddress = (...parts) => parts.filter((part) => String(part || '').trim() !== '').join(', ');

const nextBillNumber = (value) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0 || n >= 9999) return '9999';
    return String(n + 1).padStart(4, '0');
};

const buildEmptyForm = (billNumber = '') => ({
    bill_date: todayString(),
    bill_number: billNumber,
    consignee_company_id: '',
    description_of_goods: '',
    origin_location: '',
    destination: '',
    from_date: '',
    to_date: '',
    sac_code: ''
});

const GstInvoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [ownerInfo, setOwnerInfo] = useState(null);
    const [defaultConfig, setDefaultConfig] = useState({ next_bill_number: '' });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [formData, setFormData] = useState(buildEmptyForm(''));
    const [formErrors, setFormErrors] = useState({});

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
                gstInvoiceAPI.getMeta(),
                gstInvoiceAPI.getAll()
            ]);

            if (metaRes.success) {
                const meta = metaRes.data || {};
                const defaults = meta.defaults || {};
                setCompanies(meta.companies || []);
                setOwnerInfo(meta.owner || null);
                setDefaultConfig(defaults);
                setFormData((prev) => ({
                    ...prev,
                    bill_number: prev.bill_number || defaults.next_bill_number || ''
                }));
            }

            if (listRes.success) {
                setInvoices(Array.isArray(listRes.data) ? listRes.data : []);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load GST invoices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const selectedConsignee = useMemo(
        () => companies.find((company) => String(company.id) === String(formData.consignee_company_id)),
        [companies, formData.consignee_company_id]
    );

    const paginatedInvoices = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return invoices.slice(startIndex, startIndex + itemsPerPage);
    }, [invoices, currentPage, itemsPerPage]);

    const handleFieldChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const validate = () => {
        const errors = {};
        const today = todayString();

        if (!formData.bill_date) errors.bill_date = 'Required';
        if (formData.bill_date && formData.bill_date > today) errors.bill_date = 'Future date is not allowed';

        if (!formData.consignee_company_id) errors.consignee_company_id = 'Required';
        if (!String(formData.description_of_goods || '').trim()) errors.description_of_goods = 'Required';

        if (!formData.from_date) errors.from_date = 'Required';
        if (!formData.to_date) errors.to_date = 'Required';
        if (formData.from_date && formData.to_date && formData.to_date < formData.from_date) {
            errors.to_date = 'To Date must be greater than or equal to From Date';
        }

        if (!String(formData.sac_code || '').trim()) {
            errors.sac_code = 'Required';
        } else if (!/^\d+$/.test(String(formData.sac_code).trim())) {
            errors.sac_code = 'SAC code must be numeric';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const resetForm = (nextBill) => {
        setFormErrors({});
        setFormData(buildEmptyForm(nextBill || defaultConfig.next_bill_number || ''));
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        if (!validate()) return;

        const payload = {
            bill_date: formData.bill_date,
            consignee_company_id: Number(formData.consignee_company_id),
            description_of_goods: String(formData.description_of_goods || '').trim(),
            origin_location: String(formData.origin_location || '').trim() || null,
            destination: String(formData.destination || '').trim() || null,
            from_date: formData.from_date,
            to_date: formData.to_date,
            sac_code: String(formData.sac_code || '').trim(),
            created_by: authUser.id || null
        };

        try {
            setSubmitting(true);
            setError('');
            setSuccessMsg('');

            const res = await gstInvoiceAPI.create(payload);
            if (!res.success) {
                throw new Error('Failed to create GST invoice');
            }

            const created = res.data;
            setInvoices((prev) => [created, ...prev]);
            const generatedNumber = String(created.bill_number || defaultConfig.next_bill_number || '0');
            const nextGenerated = nextBillNumber(generatedNumber);
            setDefaultConfig((prev) => ({ ...prev, next_bill_number: nextGenerated }));
            resetForm(nextGenerated);
            setSuccessMsg(`GST bill ${created.bill_number} created successfully`);
            setCurrentPage(1);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to create GST invoice');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (row) => {
        const ok = await showConfirm({
            title: 'Delete GST Bill',
            message: `Delete GST bill ${row.bill_number}?`,
            confirmLabel: 'Delete',
        });
        if (!ok) return;

        try {
            setError('');
            const res = await gstInvoiceAPI.delete(row.id);
            if (res.success) {
                setInvoices((prev) => prev.filter((invoice) => invoice.id !== row.id));
                setSuccessMsg(`GST bill ${row.bill_number} deleted successfully`);
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete GST bill');
        }
    };

    const handleFilingStatusChange = async (row, status) => {
        if (!status || status === row.filing_status) return;
        try {
            setError('');
            const res = await gstInvoiceAPI.updateFilingStatus(row.id, status);
            if (res.success) {
                setInvoices((prev) => prev.map((invoice) => (
                    invoice.id === row.id ? { ...invoice, filing_status: status } : invoice
                )));
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update filing status');
        }
    };

    const handleViewPdf = (row) => {
        const ownerName = ownerInfo?.owner_name || 'Kothattai Transports';
        const ownerAddress = buildAddress(ownerInfo?.company_address, ownerInfo?.place);
        const ownerContact = ownerInfo?.contact_no || '-';
        const ownerEmail = ownerInfo?.email_id || '-';
        const ownerGst = ownerInfo?.gst_no || '-';
        const ownerPan = ownerInfo?.pan_no || '-';

        const consigneeName = row.consignee_name || row.company_name || '-';
        const consigneeAddress = row.consignee_address || buildAddress(row.company_address_1, row.company_address_2, row.company_place) || '-';
        const consigneeGst = row.consignee_gst_no || row.company_gst_no || '-';

        const doc = new jsPDF('p', 'mm', 'a4');

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('GST TAX INVOICE', 105, 12, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Owner Name: ${ownerName}`, 14, 20);
        doc.text(`Address: ${ownerAddress || '-'}`, 14, 25);
        doc.text(`Contact: ${ownerContact}`, 14, 30);
        doc.text(`Email: ${ownerEmail}`, 14, 35);
        doc.text(`GST Number: ${ownerGst}`, 14, 40);
        doc.text(`PAN Number: ${ownerPan}`, 14, 45);

        doc.autoTable({
            startY: 50,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            body: [
                ['Bill Number', row.bill_number || '-', 'Bill Date', formatDate(row.bill_date)],
                ['Consignee', consigneeName, 'Consignee GST', consigneeGst],
                ['Consignee Address', consigneeAddress, 'SAC Code', row.sac_code || '-'],
                ['From Date', formatDate(row.from_date), 'To Date', formatDate(row.to_date)]
            ],
            columnStyles: {
                0: { cellWidth: 32, fontStyle: 'bold' },
                1: { cellWidth: 68 },
                2: { cellWidth: 32, fontStyle: 'bold' },
                3: { cellWidth: 58 }
            }
        });

        const serviceStart = doc.lastAutoTable.finalY + 5;
        doc.autoTable({
            startY: serviceStart,
            head: [[
                'S. No',
                'Description Of Goods',
                'Origin',
                'Destination',
                'Quantity (MT)',
                'Amount (Freight)',
                `CGST (${toNumber(row.cgst_percent, 9)}%)`,
                `SGST (${toNumber(row.sgst_percent, 9)}%)`,
                'Total'
            ]],
            body: [[
                '1',
                row.description_of_goods || '-',
                row.origin_location || '-',
                row.destination || '-',
                toNumber(row.quantity_mt, 0).toFixed(3),
                formatMoney(row.amount_freight),
                formatMoney(row.cgst_amount),
                formatMoney(row.sgst_amount),
                formatMoney(row.invoice_total)
            ]],
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1.8 },
            headStyles: { fillColor: [238, 238, 238], textColor: [0, 0, 0] }
        });

        const declarationsStart = doc.lastAutoTable.finalY + 5;
        doc.autoTable({
            startY: declarationsStart,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            body: [
                ['Total GST', formatMoney(row.total_gst), 'Invoice Total', formatMoney(row.invoice_total)],
                ['Total In Words', row.total_in_words || '-', 'Transport Documents', row.transport_documents || 'As per way bill Annexed'],
                ['Whether tax payable under Reverse Charge', 'Yes', 'Reverse Charge Mechanism', 'No']
            ],
            columnStyles: {
                0: { cellWidth: 48, fontStyle: 'bold' },
                1: { cellWidth: 52 },
                2: { cellWidth: 48, fontStyle: 'bold' },
                3: { cellWidth: 42 }
            }
        });

        const footerY = Math.min(doc.lastAutoTable.finalY + 16, 275);
        doc.text('For,', 14, footerY);
        doc.setFont('helvetica', 'bold');
        doc.text(ownerName, 14, footerY + 5);
        doc.setFont('helvetica', 'normal');
        doc.text('Authorised Signatory', 145, footerY + 5);

        doc.save(`GST_Bill_${row.bill_number || row.id}.pdf`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[320px] text-slate-500">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <p className="text-base font-medium">Loading GST invoice generator...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="pb-5 border-b border-slate-100">
                    <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ReceiptText className="w-6 h-6 text-blue-600" />
                        GST Invoice Generator
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                        Create GST bills from selected period data and generate invoice PDF.
                    </p>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-md text-sm">{error}</div>}
                    {successMsg && <div className="p-3 bg-green-50 border border-green-100 text-green-600 rounded-md text-sm">{successMsg}</div>}

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="required">Bill Date</Label>
                                <Input
                                    type="date"
                                    value={formData.bill_date}
                                    max={todayString()}
                                    onChange={(event) => handleFieldChange('bill_date', event.target.value)}
                                />
                                {formErrors.bill_date && <p className="text-[10px] text-red-500">{formErrors.bill_date}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="required">Bill Number</Label>
                                <Input value={formData.bill_number || defaultConfig.next_bill_number || '-'} disabled className="bg-slate-50" />
                            </div>

                            <div className="space-y-2">
                                <Label className="required">Consignee</Label>
                                <Select value={formData.consignee_company_id} onValueChange={(value) => handleFieldChange('consignee_company_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select company" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companies.map((company) => (
                                            <SelectItem key={company.id} value={String(company.id)}>
                                                {company.company_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {formErrors.consignee_company_id && <p className="text-[10px] text-red-500">{formErrors.consignee_company_id}</p>}
                            </div>

                            <div className="space-y-2 md:col-span-3">
                                <Label className="required">Description Of Goods</Label>
                                <Textarea
                                    className="min-h-[70px]"
                                    value={formData.description_of_goods}
                                    onChange={(event) => handleFieldChange('description_of_goods', event.target.value)}
                                />
                                {formErrors.description_of_goods && <p className="text-[10px] text-red-500">{formErrors.description_of_goods}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Origin Location</Label>
                                <Input
                                    value={formData.origin_location}
                                    onChange={(event) => handleFieldChange('origin_location', event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Destination</Label>
                                <Input
                                    value={formData.destination}
                                    onChange={(event) => handleFieldChange('destination', event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="required">SAC Code</Label>
                                <Input
                                    value={formData.sac_code}
                                    onChange={(event) => handleFieldChange('sac_code', event.target.value)}
                                />
                                {formErrors.sac_code && <p className="text-[10px] text-red-500">{formErrors.sac_code}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="required">From Date</Label>
                                <Input
                                    type="date"
                                    value={formData.from_date}
                                    onChange={(event) => handleFieldChange('from_date', event.target.value)}
                                />
                                {formErrors.from_date && <p className="text-[10px] text-red-500">{formErrors.from_date}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="required">To Date</Label>
                                <Input
                                    type="date"
                                    value={formData.to_date}
                                    onChange={(event) => handleFieldChange('to_date', event.target.value)}
                                />
                                {formErrors.to_date && <p className="text-[10px] text-red-500">{formErrors.to_date}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Consignee GST</Label>
                                <Input
                                    disabled
                                    className="bg-slate-50"
                                    value={selectedConsignee?.gst_no || '-'}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                Generate GST Bill
                            </Button>
                            <Button type="button" variant="outline" onClick={() => resetForm(defaultConfig.next_bill_number || '')}>
                                Reset
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-none shadow-md">
                <CardHeader className="pb-5 border-b border-slate-100">
                    <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Generated GST Bills
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                    {invoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <SearchX className="w-10 h-10 mb-3" />
                            <p className="text-sm">No GST bills generated yet</p>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/60">
                                        <TableRow>
                                            <TableHead>Bill Number</TableHead>
                                            <TableHead>Bill Date</TableHead>
                                            <TableHead>Consignee</TableHead>
                                            <TableHead>From - To</TableHead>
                                            <TableHead>Amount (Freight)</TableHead>
                                            <TableHead>Total GST</TableHead>
                                            <TableHead>Invoice Total</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedInvoices.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-semibold">{row.bill_number}</TableCell>
                                                <TableCell>{formatDate(row.bill_date)}</TableCell>
                                                <TableCell>{row.consignee_name || row.company_name || '-'}</TableCell>
                                                <TableCell className="text-xs">
                                                    {formatDate(row.from_date)} - {formatDate(row.to_date)}
                                                </TableCell>
                                                <TableCell>{formatMoney(row.amount_freight)}</TableCell>
                                                <TableCell>{formatMoney(row.total_gst)}</TableCell>
                                                <TableCell className="font-semibold">{formatMoney(row.invoice_total)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => handleViewPdf(row)}>
                                                            <FileText className="w-4 h-4 mr-1" /> View Bill
                                                        </Button>
                                                        <Button variant="destructive" size="sm" onClick={() => handleDelete(row)}>
                                                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <Pagination
                                currentPage={currentPage}
                                totalItems={invoices.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={setItemsPerPage}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            <Card className="border-none shadow-md">
                <CardHeader className="pb-5 border-b border-slate-100">
                    <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        Sales GST Tracker (Output GST)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                    <div className="rounded-md border border-slate-100 overflow-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/60">
                                <TableRow>
                                    <TableHead>Bill Number</TableHead>
                                    <TableHead>Bill Date</TableHead>
                                    <TableHead>Consignee</TableHead>
                                    <TableHead>From Date</TableHead>
                                    <TableHead>To Date</TableHead>
                                    <TableHead>SAC Code</TableHead>
                                    <TableHead>Amount (Freight)</TableHead>
                                    <TableHead>CGST</TableHead>
                                    <TableHead>SGST</TableHead>
                                    <TableHead>Total GST</TableHead>
                                    <TableHead>Invoice Total</TableHead>
                                    <TableHead>Quantity (MT)</TableHead>
                                    <TableHead>Filing Status</TableHead>
                                    <TableHead>Filing Period</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={14} className="text-center text-slate-500 py-6">
                                            No tracker rows available
                                        </TableCell>
                                    </TableRow>
                                ) : invoices.map((row) => (
                                    <TableRow key={`tracker-${row.id}`}>
                                        <TableCell className="font-semibold">{row.bill_number}</TableCell>
                                        <TableCell>{formatDate(row.bill_date)}</TableCell>
                                        <TableCell>{row.consignee_name || row.company_name || '-'}</TableCell>
                                        <TableCell>{formatDate(row.from_date)}</TableCell>
                                        <TableCell>{formatDate(row.to_date)}</TableCell>
                                        <TableCell>{row.sac_code || '-'}</TableCell>
                                        <TableCell>{formatMoney(row.amount_freight)}</TableCell>
                                        <TableCell>{formatMoney(row.cgst_amount)}</TableCell>
                                        <TableCell>{formatMoney(row.sgst_amount)}</TableCell>
                                        <TableCell>{formatMoney(row.total_gst)}</TableCell>
                                        <TableCell>{formatMoney(row.invoice_total)}</TableCell>
                                        <TableCell>{toNumber(row.quantity_mt, 0).toFixed(3)}</TableCell>
                                        <TableCell>
                                            <Select value={row.filing_status || 'Not Filed'} onValueChange={(value) => handleFilingStatusChange(row, value)}>
                                                <SelectTrigger className="w-[130px]">
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Not Filed">Not Filed</SelectItem>
                                                    <SelectItem value="Filed">Filed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center gap-1 text-xs">
                                                <CalendarDays className="w-3.5 h-3.5" />
                                                {row.filing_period || '-'}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default GstInvoices;
