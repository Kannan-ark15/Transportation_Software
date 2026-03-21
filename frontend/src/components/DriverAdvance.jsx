import React, { useEffect, useMemo, useState } from 'react';
import { driverAdvanceAPI } from '../services/api';
import Pagination from './Pagination';
import {
    Plus,
    HandCoins,
    Loader2,
    SearchX
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const CASH_BANK_OPTIONS = ['Cash', 'Bank'];

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
    driver_id: '',
    advance_date: getTodayDateString(),
    advance_amount: '',
    cash_bank: 'Cash',
    remark: ''
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) => {
    const amount = toNumber(value, 0);
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const DriverAdvance = () => {
    const [drivers, setDrivers] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [formData, setFormData] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [search, setSearch] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const loadData = async () => {
        try {
            setLoading(true);
            const [metaRes, listRes] = await Promise.all([
                driverAdvanceAPI.getMeta(),
                driverAdvanceAPI.getAll()
            ]);

            if (metaRes.success) {
                setDrivers(metaRes.data?.drivers || []);
            }
            if (listRes.success) {
                setRecords(listRes.data || []);
            }
        } catch (err) {
            setError('Failed to load driver advances');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const selectedDriver = useMemo(
        () => drivers.find((driver) => String(driver.id) === String(formData.driver_id)) || null,
        [drivers, formData.driver_id]
    );

    const existingTotalAdvanceGiven = toNumber(selectedDriver?.total_advance_given, 0);
    const existingTotalRecovered = toNumber(selectedDriver?.total_recovered, 0);
    const enteredAdvanceAmount = Math.max(toNumber(formData.advance_amount, 0), 0);

    const totalAdvanceGivenPreview = Number((existingTotalAdvanceGiven + enteredAdvanceAmount).toFixed(2));
    const totalRecoveredPreview = Number(existingTotalRecovered.toFixed(2));
    const pendingAdvancePreview = Number(Math.max(totalAdvanceGivenPreview - totalRecoveredPreview, 0).toFixed(2));

    const filteredRecords = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return records;
        return records.filter((row) => (
            String(row.driver_name || '').toLowerCase().includes(q)
            || String(row.driver_code || '').toLowerCase().includes(q)
            || String(row.advance_date || '').toLowerCase().includes(q)
            || String(row.cash_bank || '').toLowerCase().includes(q)
            || String(row.remark || '').toLowerCase().includes(q)
        ));
    }, [records, search]);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

    const handleFieldChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setFormErrors((prev) => ({ ...prev, [field]: '' }));
        if (error) setError('');
    };

    const validate = () => {
        const errors = {};

        if (!formData.driver_id) errors.driver_id = 'Driver is required';
        if (!formData.advance_date) errors.advance_date = 'Advance date is required';
        if (formData.advance_date && formData.advance_date > getTodayDateString()) {
            errors.advance_date = 'Advance date cannot be a future date';
        }

        const amount = Number(formData.advance_amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            errors.advance_amount = 'Advance amount must be greater than 0';
        }

        if (!formData.cash_bank || !CASH_BANK_OPTIONS.includes(formData.cash_bank)) {
            errors.cash_bank = 'Cash / Bank is required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!validate()) return;

        try {
            setSubmitting(true);
            const payload = {
                driver_id: Number(formData.driver_id),
                advance_date: formData.advance_date,
                advance_amount: Number(Number(formData.advance_amount).toFixed(2)),
                cash_bank: formData.cash_bank,
                remark: formData.remark || null
            };

            const res = await driverAdvanceAPI.create(payload);
            if (res.success) {
                setSuccessMsg('Driver advance added successfully');
                setFormData((prev) => ({
                    ...prev,
                    advance_date: getTodayDateString(),
                    advance_amount: '',
                    remark: ''
                }));
                await loadData();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add driver advance');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <p className="text-base font-medium">Loading driver advances...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <HandCoins className="w-6 h-6 text-blue-600" />
                        Driver Advance
                    </CardTitle>
                    <p className="text-sm text-slate-500">Track driver-wise advances, recovery and pending balances</p>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 bg-green-50 border border-green-100 text-green-600 rounded-md text-sm">
                            {successMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <Label className="required">Driver Name</Label>
                                <Select
                                    value={formData.driver_id}
                                    onValueChange={(value) => handleFieldChange('driver_id', value)}
                                >
                                    <SelectTrigger className={cn(formErrors.driver_id && 'border-red-500')}>
                                        <SelectValue placeholder="Select driver" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {drivers.map((driver) => (
                                            <SelectItem key={driver.id} value={String(driver.id)}>
                                                {driver.driver_name} ({driver.driver_id})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {formErrors.driver_id && <p className="text-[10px] text-red-500">{formErrors.driver_id}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label className="required">Advance Date</Label>
                                <Input
                                    type="date"
                                    max={getTodayDateString()}
                                    value={formData.advance_date}
                                    onChange={(e) => handleFieldChange('advance_date', e.target.value)}
                                    className={cn(formErrors.advance_date && 'border-red-500')}
                                />
                                {formErrors.advance_date && <p className="text-[10px] text-red-500">{formErrors.advance_date}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label className="required">Advance Amount</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.advance_amount}
                                    onChange={(e) => handleFieldChange('advance_amount', e.target.value)}
                                    className={cn(formErrors.advance_amount && 'border-red-500')}
                                    placeholder="0.00"
                                />
                                {formErrors.advance_amount && <p className="text-[10px] text-red-500">{formErrors.advance_amount}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label className="required">Cash / Bank</Label>
                                <Select
                                    value={formData.cash_bank}
                                    onValueChange={(value) => handleFieldChange('cash_bank', value)}
                                >
                                    <SelectTrigger className={cn(formErrors.cash_bank && 'border-red-500')}>
                                        <SelectValue placeholder="Select mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CASH_BANK_OPTIONS.map((option) => (
                                            <SelectItem key={option} value={option}>{option}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {formErrors.cash_bank && <p className="text-[10px] text-red-500">{formErrors.cash_bank}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label>Total Advance Given</Label>
                                <Input disabled value={formatMoney(totalAdvanceGivenPreview)} className="bg-slate-50" />
                            </div>
                            <div className="space-y-1">
                                <Label>Total Recovered</Label>
                                <Input disabled value={formatMoney(totalRecoveredPreview)} className="bg-slate-50" />
                            </div>
                            <div className="space-y-1">
                                <Label>Pending Advance</Label>
                                <Input disabled value={formatMoney(pendingAdvancePreview)} className="bg-slate-50" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>Remark</Label>
                            <Textarea
                                value={formData.remark}
                                onChange={(e) => handleFieldChange('remark', e.target.value)}
                                placeholder="Optional notes"
                                className="min-h-[90px]"
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                <Plus className="w-4 h-4 mr-2" />
                                Add Advance
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-none shadow-md">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-xl font-bold text-slate-900">Driver Advance Records</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label>Search</Label>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by driver, date, mode, remark..."
                            />
                        </div>
                    </div>

                    {filteredRecords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <SearchX className="w-10 h-10 mb-3" />
                            <p className="text-sm">No driver advance records found</p>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/60">
                                        <TableRow>
                                            <TableHead className="w-[70px]">Sl.No</TableHead>
                                            <TableHead>Advance Date</TableHead>
                                            <TableHead>Driver Name</TableHead>
                                            <TableHead>Advance Amount</TableHead>
                                            <TableHead>Cash / Bank</TableHead>
                                            <TableHead>Total Advance Given</TableHead>
                                            <TableHead>Total Recovered</TableHead>
                                            <TableHead>Pending Advance</TableHead>
                                            <TableHead>Remark</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((row, index) => (
                                            <TableRow key={row.id} className="hover:bg-slate-50/40">
                                                <TableCell className="text-xs text-slate-500">{startIndex + index + 1}</TableCell>
                                                <TableCell>{row.advance_date}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{row.driver_name}</div>
                                                    <div className="text-xs text-slate-500">{row.driver_code || '-'}</div>
                                                </TableCell>
                                                <TableCell>{formatMoney(row.advance_amount)}</TableCell>
                                                <TableCell>{row.cash_bank}</TableCell>
                                                <TableCell>{formatMoney(row.total_advance_given)}</TableCell>
                                                <TableCell>{formatMoney(row.total_recovered)}</TableCell>
                                                <TableCell>{formatMoney(row.pending_advance)}</TableCell>
                                                <TableCell className="max-w-[240px] truncate" title={row.remark || ''}>
                                                    {row.remark || '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <Pagination
                                currentPage={currentPage}
                                totalItems={filteredRecords.length}
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

export default DriverAdvance;
