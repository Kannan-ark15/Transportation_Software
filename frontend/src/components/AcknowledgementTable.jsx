import React, { useEffect, useMemo, useState } from 'react';
import { acknowledgementAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, SearchX } from 'lucide-react';

const AcknowledgementTable = ({ refreshKey = 0 }) => {
    const [rows, setRows] = useState([]), [loading, setLoading] = useState(true);
    const [voucher, setVoucher] = useState(''), [status, setStatus] = useState('All');
    useEffect(() => {
        const load = async () => {
            try { setLoading(true); const res = await acknowledgementAPI.getAll(); if (res.success) setRows(res.data); }
            finally { setLoading(false); }
        };
        load();
    }, [refreshKey]);
    const filtered = useMemo(() => {
        const v = voucher.trim().toLowerCase();
        return rows.filter(r => {
            const okVoucher = !v || String(r.voucher_number || '').toLowerCase().includes(v);
            const okStatus = status === 'All' || r.voucher_status === status;
            return okVoucher && okStatus;
        });
    }, [rows, voucher, status]);
    if (loading) {
        return (<div className="flex flex-col items-center justify-center min-h-[200px] text-slate-500"><Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" /><p className="text-sm font-medium">Loading acknowledgements...</p></div>);
    }
    return (
        <Card className="border-none shadow-md">
            <CardHeader className="border-b border-slate-100"><CardTitle className="text-xl font-bold text-slate-900">Acknowledgement Records</CardTitle></CardHeader>
            <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1"><Label>Voucher No</Label><Input list="ack_voucher_list" value={voucher} onChange={e => setVoucher(e.target.value)} placeholder="Select voucher" /></div>
                    <div className="space-y-1"><Label>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent>{['All', 'Pending', 'Settled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <datalist id="ack_voucher_list">{rows.map(r => <option key={r.id} value={r.voucher_number} />)}</datalist>
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400"><SearchX className="w-10 h-10 mb-3" /><p className="text-sm">No data found</p></div>
                ) : (
                    <div className="rounded-md border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50/60">
                                <TableRow>
                                    <TableHead className="w-[70px]">Sl.No</TableHead>
                                    <TableHead>Voucher No</TableHead>
                                    <TableHead>Vehicle No</TableHead>
                                    <TableHead>Voucher Status</TableHead>
                                    <TableHead>Pending Amount</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((r, i) => (
                                    <TableRow key={r.id} className="hover:bg-slate-50/40">
                                        <TableCell className="text-xs text-slate-500">{i + 1}</TableCell>
                                        <TableCell className="font-medium">{r.voucher_number}</TableCell>
                                        <TableCell>{r.vehicle_registration_number || '-'}</TableCell>
                                        <TableCell>{r.voucher_status}</TableCell>
                                        <TableCell>{Number(r.voucher_pending_amount || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default AcknowledgementTable;
