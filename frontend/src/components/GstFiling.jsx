import React, { useState, useEffect } from 'react';
import { gstFilingAPI } from '../services/api';
import {
    Loader2,
    ReceiptText,
    TrendingUp,
    TrendingDown,
    Calculator,
    SearchX,
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const formatCurrency = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '₹0.00';
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const GstFiling = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await gstFilingAPI.getSummary();
            if (res.success) {
                setData(res.data);
            }
        } catch (err) {
            setError('Failed to load GST filing data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-lg font-medium">Loading GST filing summary...</p>
            </div>
        );
    }

    const periods = data?.periods || [];
    const totals = data?.totals || {};

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Sales GST</p>
                                <p className="text-2xl font-bold text-blue-700 mt-1">
                                    {formatCurrency(totals.total_sales_gst)}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Output GST from Invoices</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-gradient-to-br from-emerald-50 to-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Purchase GST</p>
                                <p className="text-2xl font-bold text-emerald-700 mt-1">
                                    {formatCurrency(totals.total_purchase_gst)}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Input GST from ITC Ledger</p>
                            </div>
                            <div className="p-3 bg-emerald-100 rounded-xl">
                                <TrendingDown className="w-6 h-6 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn(
                    "border-none shadow-md bg-gradient-to-br to-white",
                    totals.total_payable_gst > 0 ? "from-amber-50" : "from-green-50"
                )}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Payable GST</p>
                                <p className={cn(
                                    "text-2xl font-bold mt-1",
                                    totals.total_payable_gst > 0 ? "text-amber-700" : "text-green-700"
                                )}>
                                    {formatCurrency(totals.total_payable_gst)}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Sales GST − Purchase GST</p>
                            </div>
                            <div className={cn(
                                "p-3 rounded-xl",
                                totals.total_payable_gst > 0 ? "bg-amber-100" : "bg-green-100"
                            )}>
                                <Calculator className={cn(
                                    "w-6 h-6",
                                    totals.total_payable_gst > 0 ? "text-amber-600" : "text-green-600"
                                )} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filing Summary Table */}
            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <ReceiptText className="w-6 h-6 text-indigo-600" />
                            GST Filing Summary
                        </CardTitle>
                        <p className="text-sm text-slate-500">Period-wise GST breakdown — Output, Input &amp; Payable</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={loadData}
                        className="gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </Button>
                </CardHeader>

                <CardContent className="pt-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {periods.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <SearchX className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Filing Data</h3>
                            <p className="text-slate-500 mb-6">GST filing data will appear once invoices and ITC entries are recorded.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border border-slate-100 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="w-[80px] font-bold text-slate-700">S.No</TableHead>
                                        <TableHead className="font-bold text-slate-700">Filing Period</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-right">Sales GST (Output)</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-right">Purchase GST (Input)</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-right">Payable GST</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-center">Invoices</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-center">ITC Entries</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {periods.map((period, i) => (
                                        <TableRow key={period.filing_period} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="font-medium text-slate-500 text-xs">
                                                {i + 1}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <ReceiptText className="w-4 h-4 text-indigo-400" />
                                                    <span className="font-semibold text-slate-900">
                                                        FY {period.filing_period}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="font-semibold text-blue-700">
                                                    {formatCurrency(period.sales_gst)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="font-semibold text-emerald-700">
                                                    {formatCurrency(period.purchase_gst)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={cn(
                                                    "font-bold",
                                                    period.payable_gst > 0 ? "text-amber-700" : "text-green-700"
                                                )}>
                                                    {formatCurrency(period.payable_gst)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="border-blue-100 text-blue-700 bg-blue-50/30">
                                                    {period.invoice_count}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="border-emerald-100 text-emerald-700 bg-emerald-50/30">
                                                    {period.itc_entry_count}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className={cn(
                                                    "border-none",
                                                    period.payable_gst <= 0
                                                        ? "bg-green-50 text-green-700"
                                                        : "bg-amber-50 text-amber-700"
                                                )}>
                                                    {period.payable_gst <= 0 ? 'Credit Available' : 'Payable'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {/* Totals Row */}
                                    <TableRow className="bg-slate-50 border-t-2 border-slate-200">
                                        <TableCell colSpan={2}>
                                            <span className="font-bold text-slate-900">TOTAL</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-bold text-blue-800">
                                                {formatCurrency(totals.total_sales_gst)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-bold text-emerald-800">
                                                {formatCurrency(totals.total_purchase_gst)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={cn(
                                                "font-bold",
                                                totals.total_payable_gst > 0 ? "text-amber-800" : "text-green-800"
                                            )}>
                                                {formatCurrency(totals.total_payable_gst)}
                                            </span>
                                        </TableCell>
                                        <TableCell colSpan={3}></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default GstFiling;
