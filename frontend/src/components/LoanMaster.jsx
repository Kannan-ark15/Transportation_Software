import React, { useEffect, useMemo, useRef, useState } from 'react';
import { loanMasterAPI } from '../services/api';
import Pagination from './Pagination';
import {
    Plus,
    Eye,
    Edit,
    Trash2,
    SearchX,
    Loader2,
    Landmark,
    CalendarClock,
    Calculator,
    UploadCloud,
    FileCheck2
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

const FREQUENCY_OPTIONS = [
    'Monthly',
    'Quarterly',
    'Half-Yearly',
    'Yearly',
    'Weekly',
    'Fortnightly',
    'Bullet Payment',
    'Structured / Custom EMI',
    'N/A'
];

const LOAN_TYPE_OPTIONS = [
    'Commercial Vehicle Loan',
    'New Commercial Vehicle Loan',
    'Used Commercial Vehicle Loan',
    'Commercial Vehicle Refinance',
    'Commercial Vehicle Top-Up Loan',
    'Fleet Owner Finance',
    'Loan Against Commercial Vehicle (LACV)',
    'Balance Transfer Commercial Vehicle Loan',
    'Refinance with Top-Up',
    'Step-Up EMI Commercial Vehicle Loan',
    'Step-Down EMI Commercial Vehicle Loan',
    'Construction Equipment Loan',
    'Tractor Loan',
    'Farm Equipment Loan',
    'Machinery Loan',
    'Industrial Equipment Loan',
    'Material Handling Equipment Loan',
    'Crane / Earthmover Finance',
    'Generator / DG Set Finance',
    'Working Capital Loan',
    'Business Term Loan',
    'MSME Loan',
    'Mudra Loan (if small operator)',
    'Line of Credit / OD Facility',
    'Cash Credit Loan',
    'Balance Transfer Loan',
    'Refinance Loan',
    'Restructured Loan',
    'Settlement Loan',
    'Top-Up on Existing Loan',
    'Passenger Vehicle Loan',
    'Three Wheeler Loan',
    'Two Wheeler Loan',
    'Electric Vehicle Commercial Loan',
    'Hire Purchase Loan',
    'Lease Financing',
    'Operating Lease',
    'Finance Lease',
    'Other'
];

const emptyForm = {
    bank_id: '',
    vehicle_id: '',
    financier: '',
    agreement_number: '',
    loan_type: '',
    other_loan_type: '',
    loan_amount: '',
    tenure: '',
    total_installments: '',
    frequency: 'Monthly',
    first_due_date: ''
};

const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
        const raw = String(value);
        return raw.length >= 10 ? raw.slice(0, 10) : '';
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const addIntervalDate = (baseDate, frequency, step) => {
    if (!baseDate) return '';
    const d = new Date(baseDate);
    if (Number.isNaN(d.getTime())) return '';

    if (frequency === 'Monthly') d.setMonth(d.getMonth() + step);
    else if (frequency === 'Quarterly') d.setMonth(d.getMonth() + (step * 3));
    else if (frequency === 'Half-Yearly') d.setMonth(d.getMonth() + (step * 6));
    else if (frequency === 'Yearly') d.setFullYear(d.getFullYear() + step);
    else if (frequency === 'Weekly') d.setDate(d.getDate() + (step * 7));
    else if (frequency === 'Fortnightly') d.setDate(d.getDate() + (step * 14));
    else d.setDate(d.getDate() + 0);

    return formatDate(d);
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const formatINR = (value) => {
    const n = toNumber(value, 0);
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── PDF Parsing Helpers ───────────────────────────────────────────────────────

/**
 * Send PDF to the backend for server-side OCR parsing.
 * Returns { agreementNumber, loanType, loanAmount, tenure, totalInstallments, frequency, scheduleRows }
 */
const parseHDFCRepaymentPDF = async (file) => {
    // loanMasterAPI.parsePdf() handles FormData wrapping + multipart headers internally.
    // It returns already-parsed response.data (axios), not a raw fetch Response.
    const data = await loanMasterAPI.parsePdf(file);
    if (!data.success) {
        throw new Error(data.message || 'Failed to parse PDF');
    }
    return data.data;
};

const LoanMaster = () => {
    const [loans, setLoans] = useState([]);
    const [banks, setBanks] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [search, setSearch] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [formData, setFormData] = useState(emptyForm);
    const [schedules, setSchedules] = useState([]);
    const [formErrors, setFormErrors] = useState({});
    const [pdfParsing, setPdfParsing] = useState(false);
    const [pdfFileName, setPdfFileName] = useState('');
    const [pdfError, setPdfError] = useState('');
    const pdfInputRef = useRef(null);

    const buildScheduleRows = (nextForm, existingRows = [], forceDateRecalc = false) => {
        const count = Math.max(0, Number(nextForm.total_installments) || 0);
        if (count === 0) return [];

        const firstDueDate = nextForm.first_due_date ? formatDate(nextForm.first_due_date) : '';
        const nextRows = [];
        for (let i = 0; i < count; i += 1) {
            const existing = existingRows[i] || {};
            const computedDate = firstDueDate ? addIntervalDate(firstDueDate, nextForm.frequency, i) : '';
            const dueDate = forceDateRecalc ? (computedDate || formatDate(existing.due_date)) : (formatDate(existing.due_date) || computedDate);

            nextRows.push({
                installment_number: i + 1,
                due_date: dueDate,
                principal: existing.principal ?? '',
                interest: existing.interest ?? ''
            });
        }
        return nextRows;
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const [metaRes, loansRes] = await Promise.all([
                loanMasterAPI.getMeta(),
                loanMasterAPI.getAll()
            ]);

            if (metaRes.success) {
                setBanks(metaRes.data.banks || []);
                setVehicles(metaRes.data.vehicles || []);
            }
            if (loansRes.success) {
                setLoans(loansRes.data || []);
            }
        } catch (err) {
            setError('Failed to load loan master data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const computedSchedules = useMemo(() => {
        const loanAmount = Number(toNumber(formData.loan_amount, 0).toFixed(2));
        let runningOutstanding = loanAmount;
        let totalDue = 0;

        const rows = schedules.map((row, idx) => {
            const principal = Number(toNumber(row.principal, 0).toFixed(2));
            const interest = Number(toNumber(row.interest, 0).toFixed(2));
            // Use due_amount from PDF if available, else calculate
            const dueAmount = row.due_amount != null
                ? Number(toNumber(row.due_amount, 0).toFixed(2))
                : Number((principal + interest).toFixed(2));
            // Use outstanding_principal from PDF if available (avoids floating point drift)
            let outstandingPrincipal;
            if (row.outstanding_principal != null) {
                outstandingPrincipal = Number(toNumber(row.outstanding_principal, 0).toFixed(2));
            } else {
                runningOutstanding = Number((runningOutstanding - principal).toFixed(2));
                outstandingPrincipal = runningOutstanding < 0 ? 0 : runningOutstanding;
            }
            totalDue += dueAmount;
            return {
                ...row,
                installment_number: idx + 1,
                due_amount: dueAmount,
                outstanding_principal: outstandingPrincipal
            };
        });

        return { rows, totalDue: Number(totalDue.toFixed(2)) };
    }, [schedules, formData.loan_amount]);

    const filteredLoans = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return loans;
        return loans.filter((row) =>
            String(row.vehicle_number || '').toLowerCase().includes(q)
            || String(row.agreement_number || '').toLowerCase().includes(q)
            || String(row.loan_type || '').toLowerCase().includes(q)
            || String(row.bank_name || '').toLowerCase().includes(q)
        );
    }, [search, loans]);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredLoans.slice(startIndex, startIndex + itemsPerPage);

    const handleOpenModal = async (mode, loan = null) => {
        setModalMode(mode);
        setSelectedLoan(loan);
        setFormErrors({});
        setError('');
        setPdfFileName('');
        setPdfError('');

        if (!loan || mode === 'add') {
            setFormData(emptyForm);
            setSchedules([]);
            setModalOpen(true);
            return;
        }

        try {
            const detailRes = await loanMasterAPI.getById(loan.id);
            if (!detailRes.success) {
                setError('Failed to load loan details');
                return;
            }
            const details = detailRes.data;
            const detailSchedules = (details.schedules || []).map((row) => ({
                installment_number: Number(row.installment_number),
                due_date: formatDate(row.due_date),
                principal: row.principal,
                interest: row.interest
            }));

            setFormData({
                bank_id: details.bank_id ? String(details.bank_id) : '',
                vehicle_id: details.vehicle_id ? String(details.vehicle_id) : '',
                financier: details.financier || '',
                agreement_number: details.agreement_number || '',
                loan_type: details.loan_type || '',
                other_loan_type: details.other_loan_type || '',
                loan_amount: details.loan_amount ?? '',
                tenure: details.tenure ?? '',
                total_installments: details.total_installments ?? '',
                frequency: details.frequency || 'Monthly',
                first_due_date: detailSchedules[0]?.due_date || ''
            });
            setSchedules(detailSchedules);
            setModalOpen(true);
        } catch (err) {
            setError('Failed to load loan details');
        }
    };

    const handleFieldChange = (field, value) => {
        const nextForm = { ...formData, [field]: value };
        if (field === 'loan_type' && value !== 'Other') {
            nextForm.other_loan_type = '';
        }
        setFormData(nextForm);

        if (field === 'total_installments') {
            setSchedules(buildScheduleRows(nextForm, schedules, false));
        }

        if (field === 'frequency' || field === 'first_due_date') {
            setSchedules(buildScheduleRows(nextForm, schedules, true));
        }
    };

    const updateScheduleField = (idx, field, value) => {
        setSchedules((prev) =>
            prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
        );
    };


    const handlePdfUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setPdfError('Please upload a valid PDF file.');
            return;
        }

        setPdfParsing(true);
        setPdfError('');
        setPdfFileName(file.name);

        try {
            const parsed = await parseHDFCRepaymentPDF(file);

            if (!parsed.scheduleRows.length) {
                setPdfError('No schedule rows found in PDF. Please check the file format.');
                setPdfParsing(false);
                return;
            }

            const nextForm = { ...formData };
            if (parsed.agreementNumber) nextForm.agreement_number = parsed.agreementNumber;
            if (parsed.loanType) nextForm.loan_type = parsed.loanType;
            if (!isNaN(parsed.loanAmount) && parsed.loanAmount > 0) nextForm.loan_amount = String(parsed.loanAmount);
            if (!isNaN(parsed.tenure) && parsed.tenure > 0) nextForm.tenure = String(parsed.tenure);
            if (!isNaN(parsed.totalInstallments) && parsed.totalInstallments > 0) nextForm.total_installments = String(parsed.totalInstallments);
            if (parsed.frequency) nextForm.frequency = parsed.frequency;
            if (parsed.scheduleRows[0]?.due_date) nextForm.first_due_date = parsed.scheduleRows[0].due_date;

            setFormData(nextForm);
            setSchedules(parsed.scheduleRows);
        } catch (err) {
            console.error('PDF parse error:', err);
            setPdfError('Failed to parse PDF. Please check the file format.');
        } finally {
            setPdfParsing(false);
            if (pdfInputRef.current) pdfInputRef.current.value = '';
        }
    };

    const validate = () => {
        const errors = {};
        if (!formData.bank_id) errors.bank_id = 'Required';
        if (!formData.vehicle_id) errors.vehicle_id = 'Required';
        if (!/^\d+$/.test(String(formData.agreement_number || '').trim())) errors.agreement_number = 'Numeric only';
        if (!formData.loan_type) errors.loan_type = 'Required';
        if (formData.loan_type === 'Other' && !String(formData.other_loan_type || '').trim()) errors.other_loan_type = 'Required for Other';
        if (toNumber(formData.loan_amount, 0) <= 0) errors.loan_amount = 'Must be greater than 0';
        if ((Number(formData.tenure) || 0) <= 0) errors.tenure = 'Must be greater than 0';
        if ((Number(formData.total_installments) || 0) <= 0) errors.total_installments = 'Must be greater than 0';
        if (!formData.frequency) errors.frequency = 'Required';

        const totalInstallments = Number(formData.total_installments) || 0;
        if (!Array.isArray(schedules) || schedules.length !== totalInstallments) {
            errors.schedules = 'Schedule rows must match total installments';
        }

        let principalTotal = 0;
        schedules.forEach((row, index) => {
            const installmentNumber = index + 1;
            if (!row.due_date) {
                errors[`due_date_${index}`] = `Due date required for installment ${installmentNumber}`;
            }
            const principal = toNumber(row.principal, NaN);
            const interest = toNumber(row.interest, NaN);
            if (!Number.isFinite(principal) || principal < 0) {
                errors[`principal_${index}`] = `Principal invalid for installment ${installmentNumber}`;
            } else {
                principalTotal += principal;
            }
            if (!Number.isFinite(interest) || interest < 0) {
                errors[`interest_${index}`] = `Interest invalid for installment ${installmentNumber}`;
            }
        });

        if (principalTotal > toNumber(formData.loan_amount, 0) + 0.01) {
            errors.schedules = 'Total principal cannot exceed loan amount';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        const payload = {
            bank_id: Number(formData.bank_id),
            vehicle_id: Number(formData.vehicle_id),
            financier: formData.financier || null,
            agreement_number: String(formData.agreement_number || '').trim(),
            loan_type: formData.loan_type,
            other_loan_type: formData.loan_type === 'Other' ? (formData.other_loan_type || null) : null,
            loan_amount: Number(toNumber(formData.loan_amount, 0).toFixed(2)),
            tenure: Number(formData.tenure),
            total_installments: Number(formData.total_installments),
            frequency: formData.frequency,
            schedules: schedules.map((row, index) => ({
                installment_number: index + 1,
                due_date: row.due_date,
                principal: Number(toNumber(row.principal, 0).toFixed(2)),
                interest: Number(toNumber(row.interest, 0).toFixed(2))
            }))
        };

        try {
            setSubmitting(true);
            let res;
            if (modalMode === 'add') {
                res = await loanMasterAPI.create(payload);
            } else {
                res = await loanMasterAPI.update(selectedLoan.id, payload);
            }

            if (res.success) {
                setSuccessMsg(`Loan master ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
                setModalOpen(false);
                setFormData(emptyForm);
                setSchedules([]);
                await loadData();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save loan master');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (loan) => {
        const ok = await showConfirm({
            title: 'Delete Loan Agreement',
            message: `Are you sure you want to delete loan agreement "${loan.agreement_number}"?`,
            confirmLabel: 'Delete',
        });
        if (!ok) return;
        try {
            const res = await loanMasterAPI.delete(loan.id);
            if (res.success) {
                setSuccessMsg('Loan master deleted successfully');
                await loadData();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete loan master');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <p className="text-base font-medium">Loading loan master...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Landmark className="w-6 h-6 text-blue-600" />
                            Loan Master
                        </CardTitle>
                        <p className="text-sm text-slate-500">Manage loan master details, loan schedule details, and total due</p>
                    </div>
                    <Button
                        onClick={() => handleOpenModal('add')}
                        className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Loan Master
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

                    <div className="mb-4 max-w-sm">
                        <Label>Search</Label>
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by vehicle/agreement/loan type"
                        />
                    </div>

                    {filteredLoans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <SearchX className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Loan Masters Found</h3>
                            <p className="text-slate-500 mb-6">Create your first loan master record.</p>
                            <Button variant="outline" onClick={() => handleOpenModal('add')}>
                                Add Loan Master
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[80px] font-bold text-slate-700">S.No</TableHead>
                                            <TableHead className="font-bold text-slate-700">Bank</TableHead>
                                            <TableHead className="font-bold text-slate-700">Vehicle</TableHead>
                                            <TableHead className="font-bold text-slate-700">Agreement</TableHead>
                                            <TableHead className="font-bold text-slate-700">Loan Type</TableHead>
                                            <TableHead className="font-bold text-slate-700">Amount</TableHead>
                                            <TableHead className="font-bold text-slate-700">Total Due</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((row, index) => (
                                            <TableRow key={row.id} className="hover:bg-slate-50/40">
                                                <TableCell className="text-xs text-slate-500">{startIndex + index + 1}</TableCell>
                                                <TableCell>{row.bank_name}</TableCell>
                                                <TableCell>{row.vehicle_number}</TableCell>
                                                <TableCell className="font-mono">{row.agreement_number}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{row.loan_type}</div>
                                                    {row.loan_type === 'Other' && row.other_loan_type && (
                                                        <div className="text-xs text-slate-500">{row.other_loan_type}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell>{Number(toNumber(row.loan_amount, 0)).toFixed(2)}</TableCell>
                                                <TableCell>{Number(toNumber(row.total_due, 0)).toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleOpenModal('view', row)}
                                                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleOpenModal('edit', row)}
                                                            className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(row)}
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
                                    totalItems={filteredLoans.length}
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
                <DialogContent className="min-w-0 w-[96vw] max-w-[1200px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {modalMode === 'add' ? <Plus className="w-5 h-5 text-blue-600" /> : modalMode === 'edit' ? <Edit className="w-5 h-5 text-amber-600" /> : <Eye className="w-5 h-5 text-blue-600" />}
                            {modalMode === 'add' ? 'Add Loan Master' : modalMode === 'edit' ? 'Edit Loan Master' : 'Loan Master Details'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-8 py-4 px-1">
                        <fieldset disabled={modalMode === 'view'} className="space-y-8">
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Landmark className="w-4 h-4" /> Loan Master Details
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <Label className="required">Bank Name</Label>
                                        <Select value={formData.bank_id} onValueChange={(v) => handleFieldChange('bank_id', v)}>
                                            <SelectTrigger className={cn(formErrors.bank_id && 'border-red-500')}>
                                                <SelectValue placeholder="Select bank" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {banks.map((b) => (
                                                    <SelectItem key={b.id} value={String(b.id)}>
                                                        {b.bank_name} - {b.branch}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
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
                                    </div>
                                    <div className="space-y-1 lg:col-span-2">
                                        <Label>Financier</Label>
                                        <Textarea
                                            value={formData.financier}
                                            onChange={(e) => handleFieldChange('financier', e.target.value)}
                                            className="min-h-[40px]"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <Label className="required">Agreement Number</Label>
                                        <Input
                                            value={formData.agreement_number}
                                            onChange={(e) => handleFieldChange('agreement_number', e.target.value)}
                                            className={cn('font-mono', formErrors.agreement_number && 'border-red-500')}
                                        />
                                    </div>
                                    <div className="space-y-1 lg:col-span-2">
                                        <Label className="required">Loan Type</Label>
                                        <Select value={formData.loan_type} onValueChange={(v) => handleFieldChange('loan_type', v)}>
                                            <SelectTrigger className={cn(formErrors.loan_type && 'border-red-500')}>
                                                <SelectValue placeholder="Select loan type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {LOAN_TYPE_OPTIONS.map((type) => (
                                                    <SelectItem key={type} value={type}>
                                                        {type}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Other</Label>
                                        <Textarea
                                            value={formData.other_loan_type}
                                            disabled={formData.loan_type !== 'Other'}
                                            onChange={(e) => handleFieldChange('other_loan_type', e.target.value)}
                                            className={cn('min-h-[40px]', formErrors.other_loan_type && 'border-red-500')}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div className="space-y-1">
                                        <Label className="required">Loan Amount</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.loan_amount}
                                            onChange={(e) => handleFieldChange('loan_amount', e.target.value)}
                                            className={cn(formErrors.loan_amount && 'border-red-500')}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="required">Tenure</Label>
                                        <Input
                                            type="number"
                                            value={formData.tenure}
                                            onChange={(e) => handleFieldChange('tenure', e.target.value)}
                                            className={cn(formErrors.tenure && 'border-red-500')}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="required">Total Installments</Label>
                                        <Input
                                            type="number"
                                            value={formData.total_installments}
                                            onChange={(e) => handleFieldChange('total_installments', e.target.value)}
                                            className={cn(formErrors.total_installments && 'border-red-500')}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="required">Frequency</Label>
                                        <Select value={formData.frequency} onValueChange={(v) => handleFieldChange('frequency', v)}>
                                            <SelectTrigger className={cn(formErrors.frequency && 'border-red-500')}>
                                                <SelectValue placeholder="Select frequency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FREQUENCY_OPTIONS.map((frequency) => (
                                                    <SelectItem key={frequency} value={frequency}>
                                                        {frequency}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>1st Due Date</Label>
                                        <Input
                                            type="date"
                                            value={formData.first_due_date}
                                            onChange={(e) => handleFieldChange('first_due_date', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <CalendarClock className="w-4 h-4" /> Loan Schedule Details
                                    </h4>
                                    {modalMode !== 'view' && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                ref={pdfInputRef}
                                                type="file"
                                                accept="application/pdf"
                                                className="hidden"
                                                onChange={handlePdfUpload}
                                                id="loan-pdf-upload"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={pdfParsing}
                                                onClick={() => pdfInputRef.current?.click()}
                                                className="flex items-center gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-400"
                                            >
                                                {pdfParsing ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <UploadCloud className="w-4 h-4" />
                                                )}
                                                {pdfParsing ? 'Parsing PDF...' : 'Import from PDF'}
                                            </Button>
                                            {pdfFileName && !pdfParsing && (
                                                <span className="flex items-center gap-1 text-xs text-green-600">
                                                    <FileCheck2 className="w-3.5 h-3.5" />
                                                    {pdfFileName}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {pdfError && (
                                    <div className="p-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md">
                                        {pdfError}
                                    </div>
                                )}
                                {formErrors.schedules && (
                                    <div className="p-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md">
                                        {formErrors.schedules}
                                    </div>
                                )}
                                <div className="rounded-md border border-slate-100 overflow-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50/60">
                                            <TableRow>
                                                <TableHead>Installment No</TableHead>
                                                <TableHead>Due Date</TableHead>
                                                <TableHead>Principal</TableHead>
                                                <TableHead>Interest</TableHead>
                                                <TableHead>Due Amount</TableHead>
                                                <TableHead>Outstanding Principal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {computedSchedules.rows.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center text-sm text-slate-400 py-6">
                                                        Enter total installments to generate schedule rows.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                computedSchedules.rows.map((row, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell>
                                                            <Input disabled value={row.installment_number} className="bg-slate-50" />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="date"
                                                                value={row.due_date || ''}
                                                                onChange={(e) => updateScheduleField(idx, 'due_date', e.target.value)}
                                                                className={cn(formErrors[`due_date_${idx}`] && 'border-red-500')}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={row.principal}
                                                                onChange={(e) => updateScheduleField(idx, 'principal', e.target.value)}
                                                                className={cn(formErrors[`principal_${idx}`] && 'border-red-500')}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={row.interest}
                                                                onChange={(e) => updateScheduleField(idx, 'interest', e.target.value)}
                                                                className={cn(formErrors[`interest_${idx}`] && 'border-red-500')}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input disabled value={formatINR(row.due_amount)} className="bg-slate-50" />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input disabled value={formatINR(row.outstanding_principal)} className="bg-slate-50" />
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </fieldset>

                        <Separator />

                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Calculator className="w-4 h-4" /> Total Due
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label>Total Due</Label>
                                    <Input disabled className="bg-slate-50 font-semibold" value={formatINR(computedSchedules.totalDue)} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Total Installments</Label>
                                    <Input disabled className="bg-slate-50" value={computedSchedules.rows.length} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Frequency</Label>
                                    <Input disabled className="bg-slate-50" value={formData.frequency || '-'} />
                                </div>
                            </div>
                        </div>

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
                                    {modalMode === 'add' ? 'Create Loan Master' : 'Save Changes'}
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default LoanMaster;
