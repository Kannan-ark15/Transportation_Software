import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadingAdvanceAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ChevronLeft, Printer } from 'lucide-react';

const LoadingAdvanceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [voucher, setVoucher] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError('');
                const vRes = await loadingAdvanceAPI.getById(id);
                if (vRes.success) {
                    setVoucher(vRes.data);
                    const iRes = await loadingAdvanceAPI.getInvoices(id);
                    if (iRes.success) {
                        setInvoices(iRes.data);
                    }
                } else {
                    setError('Failed to load voucher details');
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Error loading voucher');
            } finally {
                setLoading(false);
            }
        };
        if (id) loadData();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <p className="text-base font-medium">Loading voucher details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </Button>
                <div className="p-4 bg-red-50 text-red-600 rounded-md">{error}</div>
            </div>
        );
    }

    if (!voucher) {
        return (
            <div className="space-y-4">
                <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </Button>
                <div className="p-4 bg-gray-50 text-gray-600 rounded-md">Voucher not found</div>
            </div>
        );
    }

    const isContainer = String(voucher.vehicle_body_type || '').toLowerCase().includes('container');
    const sumIfas = invoices.reduce((s, i) => s + (Number(i.ifa_amount) || 0), 0);
    const driverBata = Number(voucher.driver_bata) || 0;
    const unloading = Number(voucher.unloading) || 0;
    const tarpaulin = isContainer ? 0 : (Number(voucher.tarpaulin) || 0);
    const cityTax = Number(voucher.city_tax) || 0;
    const maintenance = Number(voucher.maintenance) || 0;
    const expenseSum = driverBata + unloading + tarpaulin + cityTax + maintenance;
    const commissionPct = Number(voucher.commission_pct) || 0;
    const commissionAmt = (sumIfas * commissionPct) / 100;
    const grossAmount = commissionPct > 0 ? (commissionAmt - expenseSum) : (sumIfas - expenseSum);
    const fuelAmount = Number(voucher.fuel_amount) || 0;
    const tdsAmount = Number(voucher.tds) || 0;
    const tripBalance = sumIfas - (commissionAmt + (Number(voucher.driver_loading_advance) || 0) + fuelAmount + tdsAmount);

    return (
        <div className="space-y-6 pb-6">
            <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </Button>
                <Button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                    <Printer className="w-4 h-4" />
                    Print
                </Button>
            </div>

            {/* Summary Dashboard */}
            <Card className="border-none shadow-md bg-gradient-to-r from-blue-50 to-slate-50">
                <CardHeader className="border-b border-blue-100">
                    <CardTitle className="text-2xl font-bold text-slate-900">Voucher Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Voucher Number</p>
                            <p className="text-2xl font-bold text-slate-900">{voucher.voucher_number}</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Vehicle</p>
                            <p className="text-lg font-semibold text-slate-900">{voucher.vehicle_registration_number}</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Driver</p>
                            <p className="text-lg font-semibold text-slate-900">{voucher.driver_name || '-'}</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Date</p>
                            <p className="text-lg font-semibold text-slate-900">
                                {voucher.voucher_datetime ? new Date(voucher.voucher_datetime).toLocaleDateString() : '-'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Trip & Voucher Information */}
            <Card className="border-none shadow-md">
                <CardHeader className="pb-2 bg-blue-50 border-b border-blue-100 rounded-t-lg">
                    <CardTitle className="text-lg font-semibold text-blue-900">Trip & Voucher Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <Label className="text-slate-600">Voucher Number</Label>
                            <Input disabled value={voucher.voucher_number || ''} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Voucher Date & Time</Label>
                            <Input disabled value={voucher.voucher_datetime ? new Date(voucher.voucher_datetime).toLocaleString() : '-'} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Vehicle Registration Number</Label>
                            <Input disabled value={voucher.vehicle_registration_number || ''} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Product Name</Label>
                            <Input disabled value={voucher.product_name || ''} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Invoice Date</Label>
                            <Input disabled value={voucher.invoice_date ? new Date(voucher.invoice_date).toLocaleDateString() : '-'} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Vehicle Type</Label>
                            <Input disabled value={voucher.vehicle_type || ''} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Vehicle Sub Type</Label>
                            <Input disabled value={voucher.vehicle_sub_type || ''} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Vehicle Body Type</Label>
                            <Input disabled value={voucher.vehicle_body_type || ''} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Owner Name</Label>
                            <Input disabled value={voucher.owner_name || ''} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Owner Type</Label>
                            <Input disabled value={voucher.owner_type || ''} className="bg-slate-50" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card className="border-none shadow-md">
                <CardHeader className="pb-2 bg-blue-50 border-b border-blue-100 rounded-t-lg">
                    <CardTitle className="text-lg font-semibold text-blue-900">Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {invoices.length === 0 ? (
                        <p className="text-slate-500 text-sm">No invoices found</p>
                    ) : (
                        <div className="rounded-md border border-slate-100 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/60">
                                    <TableRow>
                                        <TableHead>Sl.No</TableHead>
                                        <TableHead>Invoice Number</TableHead>
                                        <TableHead>To Place</TableHead>
                                        <TableHead>Dealer Name</TableHead>
                                        <TableHead className="text-right">KT Freight</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">IFA Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map((inv, idx) => (
                                        <TableRow key={inv.id} className="hover:bg-slate-50/40">
                                            <TableCell className="text-xs text-slate-500">{idx + 1}</TableCell>
                                            <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                                            <TableCell>{inv.to_place}</TableCell>
                                            <TableCell>{inv.dealer_name}</TableCell>
                                            <TableCell className="text-right">₹{Number(inv.kt_freight || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">{Number(inv.quantity || 0).toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-semibold">₹{Number(inv.ifa_amount || 0).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Charges & Predefined Trip Expenses */}
            <Card className="border-none shadow-md">
                <CardHeader className="pb-2 bg-blue-50 border-b border-blue-100 rounded-t-lg">
                    <CardTitle className="text-lg font-semibold text-blue-900">Charges & Predefined Trip Expenses</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <Label className="text-slate-600">Sum of all IFAs</Label>
                            <Input disabled value={sumIfas.toFixed(2)} className="bg-slate-50 font-semibold text-lg" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Commission %</Label>
                            <Input disabled value={commissionPct.toFixed(2)} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Commission Amount</Label>
                            <Input disabled value={commissionAmt.toFixed(2)} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Driver Bata</Label>
                            <Input disabled value={driverBata.toFixed(2)} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Unloading</Label>
                            <Input disabled value={unloading.toFixed(2)} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Tarpaulin</Label>
                            <Input disabled value={tarpaulin.toFixed(2)} className="bg-slate-50" disabled={isContainer} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">City Tax</Label>
                            <Input disabled value={cityTax.toFixed(2)} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Maintenance</Label>
                            <Input disabled value={maintenance.toFixed(2)} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Total Expenses</Label>
                            <Input disabled value={expenseSum.toFixed(2)} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Gross Amount</Label>
                            <Input disabled value={grossAmount.toFixed(2)} className="bg-slate-50 font-semibold text-lg" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Fuel & Pump Details */}
            <Card className="border-none shadow-md">
                <CardHeader className="pb-2 bg-blue-50 border-b border-blue-100 rounded-t-lg">
                    <CardTitle className="text-lg font-semibold text-blue-900">Fuel & Pump Details</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <Label className="text-slate-600">Pump Name</Label>
                            <Input disabled value={voucher.pump_name || ''} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Fuel Litre</Label>
                            <Input disabled value={Number(voucher.fuel_litre || 0).toFixed(2)} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Fuel Rate</Label>
                            <Input disabled value={Number(voucher.fuel_rate || 0).toFixed(2)} className="bg-slate-50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">Fuel Amount</Label>
                            <Input disabled value={fuelAmount.toFixed(2)} className="bg-slate-50 font-semibold text-lg" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-600">TDS (Tax Deducted at Source)</Label>
                            <Input disabled value={tdsAmount.toFixed(2)} className="bg-slate-50" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card className="border-none shadow-md bg-gradient-to-r from-green-50 to-slate-50">
                <CardHeader className="border-b border-green-100 pb-2">
                    <CardTitle className="text-lg font-semibold text-green-900">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2 p-4 bg-white rounded-lg border border-green-100">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Sum of IFAs</p>
                            <p className="text-2xl font-bold text-green-700">₹{sumIfas.toFixed(2)}</p>
                        </div>
                        <div className="space-y-2 p-4 bg-white rounded-lg border border-orange-100">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Total Deductions</p>
                            <p className="text-lg font-bold text-orange-700">₹{(commissionAmt + (Number(voucher.driver_loading_advance) || 0) + fuelAmount + tdsAmount).toFixed(2)}</p>
                        </div>
                        <div className="space-y-2 p-4 bg-white rounded-lg border border-blue-100">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Fuel Amount</p>
                            <p className="text-lg font-bold text-blue-700">₹{fuelAmount.toFixed(2)}</p>
                        </div>
                        <div className="space-y-2 p-4 bg-white rounded-lg border border-orange-100">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Trip Balance</p>
                            <p className={`text-2xl font-bold ${tripBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{tripBalance.toFixed(2)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default LoadingAdvanceDetail;
