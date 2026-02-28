import React, { useEffect, useMemo, useState } from 'react';
import { loanRepaymentAPI } from '../services/api';
import Pagination from './Pagination';
import {
    Loader2,
    SearchX,
    Landmark,
    Calculator,
    RefreshCw
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
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) => Number(toNumber(value, 0).toFixed(2));

const buildSummary = (totalInstallments, totalDue, rows) => {
    const settledRows = rows.filter((row) => Boolean(row.due_settled));
    const installmentsPaid = settledRows.length;
    const normalizedInstallments = Number(totalInstallments) || 0;
    const installmentsToBePaid = Math.max(normalizedInstallments - installmentsPaid, 0);
    const paidDue = formatMoney(
        settledRows.reduce((sum, row) => sum + toNumber(row.due_amount, 0), 0)
    );
    const normalizedTotalDue = formatMoney(totalDue);
    const balanceDue = formatMoney(Math.max(normalizedTotalDue - paidDue, 0));
    const balancePercentage = normalizedTotalDue > 0
        ? formatMoney((balanceDue / normalizedTotalDue) * 100)
        : 0;

    return {
        installments_paid: installmentsPaid,
        installments_to_be_paid: installmentsToBePaid,
        paid_due: paidDue,
        balance_due: balanceDue,
        balance_percentage: balancePercentage
    };
};

const LoanRepayment = () => {
    const [loading, setLoading] = useState(true);
    const [savingRowId, setSavingRowId] = useState(null);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [vehicleLoans, setVehicleLoans] = useState([]);
    const [summaryRows, setSummaryRows] = useState([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [activeLoan, setActiveLoan] = useState(null);
    const [installments, setInstallments] = useState([]);

    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const loadSummaryRows = async () => {
        const summaryRes = await loanRepaymentAPI.getAll();
        if (summaryRes.success) setSummaryRows(summaryRes.data || []);
    };

    const loadInitialData = async () => {
        try {
            setLoading(true);
            setError('');
            const [metaRes, summaryRes] = await Promise.all([
                loanRepaymentAPI.getMeta(),
                loanRepaymentAPI.getAll()
            ]);

            if (metaRes.success) {
                const options = metaRes.data || [];
                setVehicleLoans(options);
                if (!selectedVehicleId && options.length > 0) {
                    setSelectedVehicleId(String(options[0].vehicle_id));
                }
            }

            if (summaryRes.success) {
                setSummaryRows(summaryRes.data || []);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load loan repayment data');
        } finally {
            setLoading(false);
        }
    };

    const loadVehicleDetails = async (vehicleId) => {
        if (!vehicleId) {
            setActiveLoan(null);
            setInstallments([]);
            return;
        }
        try {
            setError('');
            const res = await loanRepaymentAPI.getByVehicle(vehicleId);
            if (res.success) {
                setActiveLoan(res.data);
                setInstallments(res.data.installments || []);
            }
        } catch (err) {
            setActiveLoan(null);
            setInstallments([]);
            setError(err.response?.data?.message || 'Failed to load selected vehicle loan repayment details');
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedVehicleId) {
            loadVehicleDetails(selectedVehicleId);
        }
    }, [selectedVehicleId]);

    const computedSummary = useMemo(() => {
        if (!activeLoan) {
            return {
                installments_paid: 0,
                installments_to_be_paid: 0,
                paid_due: 0,
                balance_due: 0,
                balance_percentage: 0
            };
        }
        return buildSummary(activeLoan.total_installments, activeLoan.total_due, installments);
    }, [activeLoan, installments]);

    const filteredSummaryRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return summaryRows;
        return summaryRows.filter((row) =>
            String(row.vehicle_number || '').toLowerCase().includes(q)
            || String(row.agreement_number || '').toLowerCase().includes(q)
            || String(row.financier || '').toLowerCase().includes(q)
        );
    }, [search, summaryRows]);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRows = filteredSummaryRows.slice(startIndex, startIndex + itemsPerPage);

    const onToggleSettled = async (rowId, checked) => {
        try {
            setSavingRowId(rowId);
            setError('');
            const res = await loanRepaymentAPI.updateStatus(rowId, { due_settled: checked });
            if (res.success) {
                setInstallments((prev) =>
                    prev.map((row) => (row.id === rowId ? { ...row, due_settled: checked } : row))
                );
                await loadSummaryRows();
                setSuccessMsg('Installment settlement status updated');
                setTimeout(() => setSuccessMsg(''), 1500);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update installment status');
        } finally {
            setSavingRowId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <p className="text-base font-medium">Loading loan repayment tracking...</p>
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
                            Loan Repayment
                        </CardTitle>
                        <p className="text-sm text-slate-500">Track installment settlement and monitor pending loan due</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={loadInitialData}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </Button>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
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

                    <div className="space-y-2 max-w-sm">
                        <Label>Search</Label>
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by vehicle/agreement/financier"
                        />
                    </div>

                    {filteredSummaryRows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <SearchX className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Loan Repayment Records Found</h3>
                            <p className="text-slate-500">Create loan masters first, then repayment tracking will appear here.</p>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[70px] font-bold text-slate-700">S.No</TableHead>
                                            <TableHead className="font-bold text-slate-700">Vehicle</TableHead>
                                            <TableHead className="font-bold text-slate-700">Agreement</TableHead>
                                            <TableHead className="font-bold text-slate-700">Financier</TableHead>
                                            <TableHead className="font-bold text-slate-700">Total Due</TableHead>
                                            <TableHead className="font-bold text-slate-700">Paid Due</TableHead>
                                            <TableHead className="font-bold text-slate-700">Balance Due</TableHead>
                                            <TableHead className="font-bold text-slate-700">Balance %</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedRows.map((row, idx) => (
                                            <TableRow key={row.loan_master_id}>
                                                <TableCell>{startIndex + idx + 1}</TableCell>
                                                <TableCell className="font-semibold text-slate-900">{row.vehicle_number}</TableCell>
                                                <TableCell className="font-mono">{row.agreement_number}</TableCell>
                                                <TableCell>{row.financier || '-'}</TableCell>
                                                <TableCell>{formatMoney(row.total_due).toFixed(2)}</TableCell>
                                                <TableCell>{formatMoney(row.paid_due).toFixed(2)}</TableCell>
                                                <TableCell>{formatMoney(row.balance_due).toFixed(2)}</TableCell>
                                                <TableCell>{formatMoney(row.balance_percentage).toFixed(2)}%</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setSelectedVehicleId(String(row.vehicle_id))}
                                                    >
                                                        Manage
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <Pagination
                                currentPage={currentPage}
                                totalItems={filteredSummaryRows.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={setItemsPerPage}
                            />
                        </>
                    )}

                    <Separator />

                    <div className="space-y-5">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Loan Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <Label className="required">Vehicle Number</Label>
                                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select vehicle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vehicleLoans.map((row) => (
                                            <SelectItem key={row.loan_master_id} value={String(row.vehicle_id)}>
                                                {row.vehicle_number}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Agreement Number</Label>
                                <Input disabled className="bg-slate-50 font-mono" value={activeLoan?.agreement_number || ''} />
                            </div>
                            <div className="space-y-1">
                                <Label>Financier</Label>
                                <Input disabled className="bg-slate-50" value={activeLoan?.financier || ''} />
                            </div>
                            <div className="space-y-1">
                                <Label>Total Installments</Label>
                                <Input disabled className="bg-slate-50" value={activeLoan?.total_installments || 0} />
                            </div>
                            <div className="space-y-1">
                                <Label>Loan Amount</Label>
                                <Input disabled className="bg-slate-50" value={formatMoney(activeLoan?.loan_amount || 0).toFixed(2)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Total Due</Label>
                                <Input disabled className="bg-slate-50 font-semibold" value={formatMoney(activeLoan?.total_due || 0).toFixed(2)} />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Settlement Details</h4>
                        <div className="rounded-md border border-slate-100 overflow-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/60">
                                    <TableRow>
                                        <TableHead>Installment Number</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Principal</TableHead>
                                        <TableHead>Interest</TableHead>
                                        <TableHead>Due Amount</TableHead>
                                        <TableHead>Outstanding Principal</TableHead>
                                        <TableHead>Due Settled</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {installments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-sm text-slate-400 py-6">
                                                Select a vehicle to load loan repayment schedule.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        installments.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell>{row.installment_number}</TableCell>
                                                <TableCell>{String(row.due_date || '').slice(0, 10)}</TableCell>
                                                <TableCell>{formatMoney(row.principal).toFixed(2)}</TableCell>
                                                <TableCell>{formatMoney(row.interest).toFixed(2)}</TableCell>
                                                <TableCell>{formatMoney(row.due_amount).toFixed(2)}</TableCell>
                                                <TableCell>{formatMoney(row.outstanding_principal).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Switch
                                                            checked={Boolean(row.due_settled)}
                                                            disabled={savingRowId === row.id}
                                                            onCheckedChange={(checked) => onToggleSettled(row.id, checked)}
                                                        />
                                                        <span className={cn(
                                                            'text-xs font-semibold',
                                                            row.due_settled ? 'text-green-600' : 'text-amber-600'
                                                        )}>
                                                            {row.due_settled ? 'Settled' : 'Not Settled'}
                                                        </span>
                                                        {savingRowId === row.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Calculator className="w-4 h-4" /> Loan Status Summary
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="space-y-1">
                                <Label>Installments Paid</Label>
                                <Input disabled className="bg-slate-50" value={computedSummary.installments_paid} />
                            </div>
                            <div className="space-y-1">
                                <Label>Installments To Be Paid</Label>
                                <Input disabled className="bg-slate-50" value={computedSummary.installments_to_be_paid} />
                            </div>
                            <div className="space-y-1">
                                <Label>Paid Due</Label>
                                <Input disabled className="bg-slate-50" value={computedSummary.paid_due.toFixed(2)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Balance Due</Label>
                                <Input disabled className="bg-slate-50 font-semibold" value={computedSummary.balance_due.toFixed(2)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Balance Percentage</Label>
                                <Input disabled className="bg-slate-50 font-semibold" value={`${computedSummary.balance_percentage.toFixed(2)}%`} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default LoanRepayment;
