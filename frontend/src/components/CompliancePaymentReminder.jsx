import React, { useCallback, useEffect, useState } from 'react';
import { reminderDashboardAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, SearchX } from 'lucide-react';

const formatDueDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString();
};

const formatAmount = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : '-';
};

const daysClassName = (daysRemaining) => {
    if (daysRemaining < 0) return 'text-red-600 font-semibold';
    if (daysRemaining <= 7) return 'text-amber-600 font-semibold';
    return 'text-slate-700';
};

const CompliancePaymentReminder = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [updatingKey, setUpdatingKey] = useState('');
    const [error, setError] = useState('');

    const loadData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError('');
            const res = await reminderDashboardAPI.getAll();
            if (res.success) setRows(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load reminder dashboard');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData(false);
    }, [loadData]);

    const toggleSettled = async (row) => {
        const nextStatus = !Boolean(row.is_settled);
        const reminderKey = row.reminder_key;
        if (!reminderKey) return;

        try {
            setUpdatingKey(reminderKey);
            const res = await reminderDashboardAPI.updateStatus({
                reminder_key: reminderKey,
                is_settled: nextStatus
            });
            if (res.success) {
                setRows((prev) =>
                    prev.map((r) =>
                        r.reminder_key === reminderKey
                            ? { ...r, is_settled: nextStatus }
                            : r
                    )
                );
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update settled status');
        } finally {
            setUpdatingKey('');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <p className="text-base font-medium">Loading compliance and payment reminders...</p>
            </div>
        );
    }

    return (
        <Card className="border-none shadow-md">
            <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold text-slate-900">Compliance and Payment Reminder</CardTitle>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => loadData(true)}
                    disabled={refreshing}
                    className="gap-2"
                >
                    {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Refresh
                </Button>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

                {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <SearchX className="w-10 h-10 mb-3" />
                        <p className="text-sm">No reminders found</p>
                    </div>
                ) : (
                    <div className="rounded-md border border-slate-100 overflow-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/60">
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Vehicle / Party</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Days Remaining</TableHead>
                                    <TableHead>Amount (if applicable)</TableHead>
                                    <TableHead>Settled Button</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => {
                                    const daysRemaining = Number(row.days_remaining);
                                    const isUpdating = updatingKey === row.reminder_key;
                                    const isSettled = Boolean(row.is_settled);
                                    return (
                                        <TableRow key={row.reminder_key || `${row.category}-${row.item}-${row.vehicle_party}-${row.due_date}`}>
                                            <TableCell>{row.category || '-'}</TableCell>
                                            <TableCell>{row.item || '-'}</TableCell>
                                            <TableCell>{row.vehicle_party || '-'}</TableCell>
                                            <TableCell>{formatDueDate(row.due_date)}</TableCell>
                                            <TableCell className={daysClassName(daysRemaining)}>
                                                {Number.isFinite(daysRemaining) ? daysRemaining : '-'}
                                            </TableCell>
                                            <TableCell>{formatAmount(row.amount)}</TableCell>
                                            <TableCell>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant={isSettled ? 'default' : 'outline'}
                                                    onClick={() => toggleSettled(row)}
                                                    disabled={isUpdating}
                                                >
                                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSettled ? 'Settled' : 'Not Settled')}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default CompliancePaymentReminder;
