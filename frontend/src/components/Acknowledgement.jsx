import React, { useEffect, useMemo, useState } from 'react';
import { acknowledgementAPI, loadingAdvanceAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import AcknowledgementTable from './AcknowledgementTable';

const Acknowledgement = () => {
    const [loading, setLoading] = useState(true), [advances, setAdvances] = useState([]);
    const [voucherId, setVoucherId] = useState(''), [voucherInfo, setVoucherInfo] = useState(null), [invoices, setInvoices] = useState([]);
    const [modalOpen, setModalOpen] = useState(false), [submitting, setSubmitting] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(''), [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => { const load = async () => { try { setLoading(true); const res = await loadingAdvanceAPI.getAll(); if (res.success) setAdvances(res.data); } finally { setLoading(false); } }; load(); }, []);
    const totalReturned = useMemo(() => invoices.reduce((s, i) => s + (Number(i.returned_amount) || 0), 0), [invoices]);
    const tripBalance = Number(voucherInfo?.trip_balance || 0);
    const pendingAmount = (tripBalance - totalReturned);
    const voucherStatus = invoices.length && invoices.every(i => i.status === 'Acknowledged') ? 'Settled' : 'Pending';

    const updateInvoice = (idx, patch) => setInvoices(list => list.map((inv, i) => i === idx ? { ...inv, ...patch } : inv));
    const setStatus = (idx, status) => {
        const ifa = Number(invoices[idx]?.ifa_amount || 0);
        const returned_amount = status === 'Acknowledged' ? ifa : status === 'Pending' ? 0 : 0;
        updateInvoice(idx, { status, returned_amount });
    };
    const onSelectVoucher = async (id) => {
        setVoucherId(id);
        setError('');
        setSuccess('');
        const v = advances.find(a => String(a.id) === String(id));
        setVoucherInfo(v || null);
        if (!id) return setInvoices([]);
        try {
            const res = await loadingAdvanceAPI.getInvoices(id);
            if (res.success) setInvoices(res.data.map(inv => ({ ...inv, status: 'Pending', returned_amount: 0 })));
        } catch {
            setError('Failed to load invoices for the selected voucher');
            setInvoices([]);
        }
    };
    const validate = () => { if (!voucherInfo) return 'Please select a voucher'; if (!invoices.length) return 'No invoices found'; for (const inv of invoices) { const ifa = Number(inv.ifa_amount || 0); const ret = Number(inv.returned_amount || 0); if (inv.status === 'Acknowledged' && Math.abs(ret - ifa) > 0.01) return `Returned amount must equal IFA for ${inv.invoice_number}`; if (inv.status === 'Shortage' && !(ret > 0 && ret < ifa)) return `Returned amount must be less than IFA for ${inv.invoice_number}`; if (inv.status === 'Pending' && ret !== 0) return `Returned amount must be 0 for ${inv.invoice_number}`; } if (pendingAmount < 0) return 'Total returned exceeds trip balance'; return ''; };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const v = validate(); if (v) return setError(v);
        try {
            setSubmitting(true);
            const payload = { loading_advance_id: voucherInfo.id, items: invoices.map(i => ({ loading_advance_invoice_id: i.id, status: i.status, returned_amount: i.returned_amount })) };
            const res = await acknowledgementAPI.create(payload);
            if (res.success) { setSuccess('Acknowledgement saved'); setModalOpen(false); setVoucherId(''); setVoucherInfo(null); setInvoices([]); setRefreshKey(k => k + 1); }
        } catch (err) { setError(err.response?.data?.message || 'Save failed'); }
        finally { setSubmitting(false); }
    };

    if (loading) return (<div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500"><Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" /><p className="text-base font-medium">Loading vouchers...</p></div>);
    return (
        <div className="space-y-6">
            <div className="flex justify-end"><Button onClick={() => { setModalOpen(true); setError(''); setSuccess(''); }} className="bg-blue-600 hover:bg-blue-700">Add Acknowledgement</Button></div>
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-5xl">
                    <DialogHeader><DialogTitle>Acknowledgement</DialogTitle></DialogHeader>
                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}
                    {success && <div className="p-3 bg-green-50 text-green-600 rounded-md text-sm">{success}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
                        <Card className="border border-slate-100 shadow-none"><CardHeader className="pb-2 bg-accent/10 border-b border-accent/20 rounded-t-lg"><CardTitle className="text-lg text-accent">Voucher & Vehicle Information</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1"><Label className="required">Voucher Number</Label><Select value={voucherId} onValueChange={onSelectVoucher}><SelectTrigger><SelectValue placeholder="Select voucher" /></SelectTrigger><SelectContent>{advances.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.voucher_number}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-1"><Label>Voucher Date</Label><Input disabled value={voucherInfo?.voucher_datetime ? new Date(voucherInfo.voucher_datetime).toLocaleString() : ''} /></div>
                                <div className="space-y-1"><Label>Vehicle Number</Label><Input disabled value={voucherInfo?.vehicle_registration_number || ''} /></div>
                                <div className="space-y-1"><Label>Invoice Date</Label><Input disabled value={voucherInfo?.invoice_date || ''} /></div>
                            </CardContent>
                        </Card>
                        <Card className="border border-slate-100 shadow-none"><CardHeader className="pb-2 bg-accent/10 border-b border-accent/20 rounded-t-lg"><CardTitle className="text-lg text-accent">Invoice List & Acknowledgement</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="rounded-md border border-slate-100 overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-50/60"><TableRow><TableHead>Invoice No</TableHead><TableHead>Invoice Date</TableHead><TableHead>To Place</TableHead><TableHead>Quantity</TableHead><TableHead>Acknowledgement Status</TableHead><TableHead>Returned Amount</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {invoices.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center text-sm text-slate-400 py-6">
                                                        Select a voucher to load invoice rows.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {invoices.map((inv, i) => (
                                                <TableRow key={inv.id}>
                                                    <TableCell>{inv.invoice_number}</TableCell>
                                                    <TableCell>{inv.invoice_date || ''}</TableCell>
                                                    <TableCell>{inv.to_place}</TableCell>
                                                    <TableCell>{Number(inv.quantity || 0).toFixed(3)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3 text-xs">
                                                            {['Acknowledged', 'Shortage', 'Pending'].map(s => (
                                                                <label key={s} className="flex items-center gap-1">
                                                                    <input type="radio" name={`status-${i}`} checked={inv.status === s} onChange={() => setStatus(i, s)} />
                                                                    {s}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={inv.returned_amount}
                                                            disabled={inv.status !== 'Shortage'}
                                                            onChange={e => inv.status === 'Shortage' && updateInvoice(i, { returned_amount: e.target.value })}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border border-slate-100 shadow-none"><CardHeader className="pb-2 bg-accent/10 border-b border-accent/20 rounded-t-lg"><CardTitle className="text-lg text-accent">Voucher Summary</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1"><Label>Trip Balance</Label><Input disabled value={tripBalance.toFixed(2)} /></div>
                                <div className="space-y-1"><Label>Total Returned</Label><Input disabled value={totalReturned.toFixed(2)} /></div>
                                <div className="space-y-1"><Label>Voucher Pending Amount</Label><Input disabled value={pendingAmount.toFixed(2)} /></div>
                                <div className="space-y-1"><Label>Voucher Status</Label>
                                    <div className="flex items-center gap-3 text-xs pt-1">
                                        {['Pending', 'Settled'].map(s => (<label key={s} className="flex items-center gap-1"><input type="radio" disabled checked={voucherStatus === s} readOnly />{s}</label>))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => { setVoucherId(''); setVoucherInfo(null); setInvoices([]); }} disabled={submitting}>Clear</Button><Button type="submit" disabled={submitting || !voucherId}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button></div>
                    </form>
                </DialogContent>
            </Dialog>
            <AcknowledgementTable refreshKey={refreshKey} />
        </div>
    );
};

export default Acknowledgement;
