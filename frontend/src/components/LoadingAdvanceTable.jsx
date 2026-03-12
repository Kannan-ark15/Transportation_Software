import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadingAdvanceAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, SearchX, Trash2 } from 'lucide-react';
import { showAlert } from '@/lib/dialogService';

const LoadingAdvanceTable = ({ refreshKey = 0 }) => {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]), [loading, setLoading] = useState(true);
    const [voucherNo, setVoucherNo] = useState(''), [vehicleNo, setVehicleNo] = useState(''), [fromDate, setFromDate] = useState(''), [toDate, setToDate] = useState('');
    const [deleting, setDeleting] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);

    const authUser = (() => { try { return JSON.parse(localStorage.getItem('auth_user') || '{}'); } catch { return {}; } })();

    useEffect(() => {
        const load = async () => {
            try { setLoading(true); const res = await loadingAdvanceAPI.getAll(); if (res.success) setRows(res.data); }
            finally { setLoading(false); }
        };
        load();
    }, [refreshKey]);

    const handleDelete = async (id, voucherNumber) => {
        try {
            setDeleting(id);
            const res = await loadingAdvanceAPI.delete(id, { user_id: authUser.id });
            if (res.success) {
                setRows(prev => prev.filter(r => r.id !== id));
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to delete record';
            showAlert({
                title: 'Delete Failed',
                message: msg,
            });
        } finally {
            setDeleting(null);
        }
    };
    const openDeleteConfirm = (row) => {
        setPendingDelete(row);
        setConfirmOpen(true);
    };
    const confirmDelete = async () => {
        if (!pendingDelete) return;
        const { id, voucher_number } = pendingDelete;
        setConfirmOpen(false);
        setPendingDelete(null);
        await handleDelete(id, voucher_number);
    };

    const filtered = useMemo(() => {
        const f = voucherNo.trim().toLowerCase(), v = vehicleNo.trim().toLowerCase();
        return rows.filter(r => {
            const okVoucher = !f || String(r.voucher_number || '').toLowerCase().includes(f);
            const okVehicle = !v || String(r.vehicle_registration_number || '').toLowerCase().includes(v);
            const d = r.voucher_datetime ? new Date(r.voucher_datetime) : null;
            const okFrom = !fromDate || (d && d >= new Date(fromDate));
            const okTo = !toDate || (d && d <= new Date(toDate + 'T23:59:59'));
            return okVoucher && okVehicle && okFrom && okTo;
        });
    }, [rows, voucherNo, vehicleNo, fromDate, toDate]);
    if (loading) {
        return (<div className="flex flex-col items-center justify-center min-h-[200px] text-slate-500"><Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" /><p className="text-sm font-medium">Loading vouchers...</p></div>);
    }
    return (
        <Card className="border-none shadow-md">
            <CardHeader className="border-b border-slate-100"><CardTitle className="text-xl font-bold text-slate-900">Loading Advance Records</CardTitle></CardHeader>
            <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1"><Label>Voucher No</Label><Input list="voucher_list" value={voucherNo} onChange={e => setVoucherNo(e.target.value)} placeholder="Select voucher" /></div>
                    <div className="space-y-1"><Label>Vehicle No</Label><Input list="vehicle_list" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="Select vehicle" /></div>
                    <div className="space-y-1"><Label>Date Range</Label><div className="grid grid-cols-2 gap-2"><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></div></div>
                </div>
                <datalist id="voucher_list">{rows.map(r => <option key={r.id} value={r.voucher_number} />)}</datalist>
                <datalist id="vehicle_list">{rows.map(r => <option key={r.id} value={r.vehicle_registration_number} />)}</datalist>
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <SearchX className="w-10 h-10 mb-3" />
                        <p className="text-sm">No data found</p>
                    </div>
                ) : (
                    <div className="rounded-md border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50/60">
                                <TableRow>
                                    <TableHead className="w-[70px]">Sl.No</TableHead>
                                    <TableHead>Voucher No</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Vehicle No</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Driver</TableHead>
                                    <TableHead>Diesel Amt</TableHead>
                                    <TableHead>Advance</TableHead>
                                    <TableHead>Trip Balance</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((r, i) => (
                                    <TableRow key={r.id} className="hover:bg-slate-50/40">
                                        <TableCell className="text-xs text-slate-500">{i + 1}</TableCell>
                                        <TableCell className="font-medium">{r.voucher_number}</TableCell>
                                        <TableCell className="text-xs">{r.voucher_datetime ? new Date(r.voucher_datetime).toLocaleDateString() : '-'}</TableCell>
                                        <TableCell>{r.vehicle_registration_number}</TableCell>
                                        <TableCell>{r.owner_name}</TableCell>
                                        <TableCell>{r.driver_name || '-'}</TableCell>
                                        <TableCell>₹{Number(r.fuel_amount || 0).toFixed(2)}</TableCell>
                                        <TableCell>₹{Number(r.driver_loading_advance || 0).toFixed(2)}</TableCell>
                                        <TableCell>₹{Number(r.trip_balance || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => navigate(`/transactions/loading-advance/${r.id}`)}>View</Button>
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    disabled={deleting === r.id}
                                                    onClick={() => openDeleteConfirm(r)}
                                                    aria-label={`Delete voucher ${r.voucher_number}`}
                                                >
                                                    {deleting === r.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Delete Loading Advance</DialogTitle>
                        <DialogDescription>
                            {pendingDelete ? `Delete voucher ${pendingDelete.voucher_number}? This action cannot be undone.` : 'This action cannot be undone.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={!pendingDelete || deleting === pendingDelete?.id}>
                            {deleting === pendingDelete?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};
export default LoadingAdvanceTable;
