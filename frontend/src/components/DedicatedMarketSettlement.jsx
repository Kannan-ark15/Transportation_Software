import React, { useEffect, useMemo, useState } from 'react';
import { dedicatedMarketSettlementAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, CircleDollarSign, SearchX, CheckCircle2 } from 'lucide-react';

const DEFAULT_COMMISSION_PERCENT = 6;
const ALL_VEHICLES = '__ALL_VEHICLES__';

const DedicatedMarketSettlement = () => {
    const [owners, setOwners] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [readyVouchers, setReadyVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [search, setSearch] = useState('');

    const [form, setForm] = useState({
        owner_id: '',
        cash_bank: 'Cash',
        bank_name: '',
        branch: '',
        account_no: '',
        ifsc_code: '',
        vehicle_number: ''
    });
    const [selectedVoucherIds, setSelectedVoucherIds] = useState([]);
    const [commissionAmount, setCommissionAmount] = useState('0.00');
    const [commissionTouched, setCommissionTouched] = useState(false);

    const selectedOwner = useMemo(
        () => owners.find(o => String(o.id) === String(form.owner_id)) || null,
        [owners, form.owner_id]
    );

    const vehicleOptions = useMemo(
        () => [...new Set(readyVouchers.map(v => v.vehicle_number))],
        [readyVouchers]
    );

    const filteredReadyVouchers = useMemo(
        () => form.vehicle_number
            ? readyVouchers.filter(v => v.vehicle_number === form.vehicle_number)
            : readyVouchers,
        [readyVouchers, form.vehicle_number]
    );

    const selectedVouchers = useMemo(
        () => readyVouchers.filter(v => selectedVoucherIds.includes(v.acknowledgement_id)),
        [readyVouchers, selectedVoucherIds]
    );

    const sumIfas = useMemo(
        () => selectedVouchers.reduce((sum, row) => sum + (Number(row.sum_ifas) || 0), 0),
        [selectedVouchers]
    );

    const finalBalance = useMemo(
        () => Number((sumIfas - (Number(commissionAmount) || 0)).toFixed(2)),
        [sumIfas, commissionAmount]
    );

    useEffect(() => {
        if (!commissionTouched) {
            setCommissionAmount(((sumIfas * DEFAULT_COMMISSION_PERCENT) / 100).toFixed(2));
        }
    }, [sumIfas, commissionTouched]);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [ownersRes, settlementsRes] = await Promise.all([
                    dedicatedMarketSettlementAPI.getOwners(),
                    dedicatedMarketSettlementAPI.getAll()
                ]);
                if (ownersRes.success) setOwners(ownersRes.data);
                if (settlementsRes.success) setSettlements(settlementsRes.data);
            } catch (err) {
                setError('Failed to load dedicated/market settlement data');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const loadReadyVouchers = async (ownerId, vehicleNumber = null) => {
        try {
            const res = await dedicatedMarketSettlementAPI.getReadyVouchers({
                owner_id: ownerId,
                vehicle_number: vehicleNumber || undefined
            });
            if (res.success) {
                setReadyVouchers(res.data);
                setSelectedVoucherIds([]);
            }
        } catch (err) {
            setError('Failed to load ready vouchers');
            setReadyVouchers([]);
            setSelectedVoucherIds([]);
        }
    };

    const loadSettlements = async () => {
        const res = await dedicatedMarketSettlementAPI.getAll();
        if (res.success) setSettlements(res.data);
    };

    const onOwnerChange = async (ownerId) => {
        const owner = owners.find(o => String(o.id) === String(ownerId));
        setForm(prev => ({
            ...prev,
            owner_id: ownerId,
            vehicle_number: '',
            bank_name: prev.cash_bank === 'Bank' ? (owner?.bank_name || '') : '',
            branch: prev.cash_bank === 'Bank' ? (owner?.branch || '') : '',
            account_no: prev.cash_bank === 'Bank' ? (owner?.account_no || '') : '',
            ifsc_code: prev.cash_bank === 'Bank' ? (owner?.ifsc_code || '') : ''
        }));
        await loadReadyVouchers(ownerId, null);
    };

    const onCashBankChange = (mode) => {
        const owner = selectedOwner;
        setForm(prev => ({
            ...prev,
            cash_bank: mode,
            bank_name: mode === 'Bank' ? (owner?.bank_name || '') : '',
            branch: mode === 'Bank' ? (owner?.branch || '') : '',
            account_no: mode === 'Bank' ? (owner?.account_no || '') : '',
            ifsc_code: mode === 'Bank' ? (owner?.ifsc_code || '') : ''
        }));
    };

    const onVehicleFilterChange = async (vehicleNumber) => {
        const normalizedVehicleNumber = vehicleNumber === ALL_VEHICLES ? '' : vehicleNumber;
        setForm(prev => ({ ...prev, vehicle_number: normalizedVehicleNumber }));
        if (form.owner_id) await loadReadyVouchers(form.owner_id, normalizedVehicleNumber || null);
    };

    const toggleVoucherSelection = (ackId) => {
        setSelectedVoucherIds(prev =>
            prev.includes(ackId) ? prev.filter(id => id !== ackId) : [...prev, ackId]
        );
    };

    const validate = () => {
        if (!form.owner_id) return 'Owner Name is required';
        if (!form.cash_bank) return 'Cash / Bank is required';
        if (selectedVoucherIds.length === 0) return 'Select at least one settlement-ready voucher';
        if (form.cash_bank === 'Bank' && (!form.bank_name || !form.branch || !form.account_no || !form.ifsc_code)) {
            return 'Bank details are required when Cash / Bank is Bank';
        }
        if ((Number(commissionAmount) || 0) < 0) return 'Commission cannot be negative';
        if ((Number(commissionAmount) || 0) > sumIfas) return 'Commission cannot exceed Sum of all IFAs';
        return '';
    };

    const handleSettled = async () => {
        setError('');
        setSuccessMsg('');
        const validationMessage = validate();
        if (validationMessage) {
            setError(validationMessage);
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                owner_id: Number(form.owner_id),
                cash_bank: form.cash_bank,
                bank_name: form.cash_bank === 'Bank' ? form.bank_name : null,
                branch: form.cash_bank === 'Bank' ? form.branch : null,
                account_no: form.cash_bank === 'Bank' ? form.account_no : null,
                ifsc_code: form.cash_bank === 'Bank' ? form.ifsc_code : null,
                commission_amount: Number(commissionAmount || 0),
                selected_vouchers: selectedVouchers.map(v => ({ acknowledgement_id: v.acknowledgement_id }))
            };

            const res = await dedicatedMarketSettlementAPI.create(payload);
            if (res.success) {
                setSuccessMsg('Dedicated/Market settlement saved successfully');
                await loadReadyVouchers(form.owner_id, form.vehicle_number || null);
                await loadSettlements();
                setCommissionTouched(false);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to settle vouchers');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredSettlements = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return settlements;
        return settlements.filter(row =>
            String(row.owner_name || '').toLowerCase().includes(q) ||
            String(row.voucher_numbers || '').toLowerCase().includes(q)
        );
    }, [settlements, search]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <p className="text-base font-medium">Loading dedicated/market balance settlement...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <CircleDollarSign className="w-6 h-6 text-emerald-600" />
                        Dedicated & Market Vehicles
                    </CardTitle>
                    <p className="text-sm text-slate-500">Balance Settlement</p>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-md text-sm">{error}</div>}
                    {successMsg && <div className="p-3 bg-green-50 border border-green-100 text-green-600 rounded-md text-sm">{successMsg}</div>}

                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Owner Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label className="required">Owner Name</Label>
                                <Select value={form.owner_id} onValueChange={onOwnerChange}>
                                    <SelectTrigger><SelectValue placeholder="Select Dedicated/Market owner" /></SelectTrigger>
                                    <SelectContent>
                                        {owners.map(owner => (
                                            <SelectItem key={owner.id} value={String(owner.id)}>
                                                {owner.owner_name} ({owner.owner_type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="required">Cash / Bank</Label>
                                <Select value={form.cash_bank} onValueChange={onCashBankChange}>
                                    <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="Bank">Bank</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {form.cash_bank === 'Bank' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <Label className="required">Bank Name</Label>
                                    <Input value={form.bank_name} onChange={e => setForm(prev => ({ ...prev, bank_name: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="required">Branch</Label>
                                    <Input value={form.branch} onChange={e => setForm(prev => ({ ...prev, branch: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="required">Account Number</Label>
                                    <Input value={form.account_no} onChange={e => setForm(prev => ({ ...prev, account_no: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="required">IFSC Code</Label>
                                    <Input value={form.ifsc_code} onChange={e => setForm(prev => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))} />
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Settlement Ready Vouchers</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label>Vehicle Number</Label>
                                <Select value={form.vehicle_number || ALL_VEHICLES} onValueChange={onVehicleFilterChange} disabled={!form.owner_id}>
                                    <SelectTrigger><SelectValue placeholder="All Vehicles" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL_VEHICLES}>All Vehicles</SelectItem>
                                        {vehicleOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="rounded-md border border-slate-100 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/60">
                                    <TableRow>
                                        <TableHead>Select</TableHead>
                                        <TableHead>Vehicle Number</TableHead>
                                        <TableHead>Voucher Number</TableHead>
                                        <TableHead>Sum of IFAs</TableHead>
                                        <TableHead>Pending/Shortage Invoices</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredReadyVouchers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-sm text-slate-400 py-6">
                                                No ready-for-settlement vouchers available for this owner.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredReadyVouchers.map(row => (
                                            <TableRow key={row.acknowledgement_id}>
                                                <TableCell>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedVoucherIds.includes(row.acknowledgement_id)}
                                                        onChange={() => toggleVoucherSelection(row.acknowledgement_id)}
                                                    />
                                                </TableCell>
                                                <TableCell>{row.vehicle_number}</TableCell>
                                                <TableCell className="font-medium">{row.voucher_number}</TableCell>
                                                <TableCell>{Number(row.sum_ifas || 0).toFixed(2)}</TableCell>
                                                <TableCell>{row.pending_shortage_invoice_numbers || '-'}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <Label>Sum of all IFAs</Label>
                                <Input disabled value={sumIfas.toFixed(2)} />
                            </div>
                            <div className="space-y-1">
                                <Label className="required">Commission</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={commissionAmount}
                                    onChange={e => {
                                        setCommissionTouched(true);
                                        setCommissionAmount(e.target.value);
                                    }}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Final Balance</Label>
                                <Input disabled value={finalBalance.toFixed(2)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Settlement Balance</Label>
                                <Input disabled value={finalBalance.toFixed(2)} />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleSettled} disabled={submitting || !form.owner_id}>
                                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Settled
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-md">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-xl font-bold text-slate-900">Settlement Records</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label>Search</Label>
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by owner / voucher number"
                            />
                        </div>
                    </div>
                    {filteredSettlements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <SearchX className="w-10 h-10 mb-3" />
                            <p className="text-sm">No settlement records found</p>
                        </div>
                    ) : (
                        <div className="rounded-md border border-slate-100 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/60">
                                    <TableRow>
                                        <TableHead className="w-[70px]">Sl.No</TableHead>
                                        <TableHead>Owner</TableHead>
                                        <TableHead>Mode</TableHead>
                                        <TableHead>Vehicle Number</TableHead>
                                        <TableHead>Voucher Number</TableHead>
                                        <TableHead>Sum IFAs</TableHead>
                                        <TableHead>Commission</TableHead>
                                        <TableHead>Settlement Balance</TableHead>
                                        <TableHead>Settled Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSettlements.map((row, index) => (
                                        <TableRow key={row.id} className="hover:bg-slate-50/40">
                                            <TableCell className="text-xs text-slate-500">{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{row.owner_name}</div>
                                                <div className="text-xs text-slate-500">{row.owner_type}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{row.cash_bank}</Badge>
                                            </TableCell>
                                            <TableCell>{row.vehicle_numbers || '-'}</TableCell>
                                            <TableCell>{row.voucher_numbers || '-'}</TableCell>
                                            <TableCell>{Number(row.sum_ifas || 0).toFixed(2)}</TableCell>
                                            <TableCell>{Number(row.commission_amount || 0).toFixed(2)}</TableCell>
                                            <TableCell>{Number(row.settlement_balance || 0).toFixed(2)}</TableCell>
                                            <TableCell>{row.settled_at ? new Date(row.settled_at).toLocaleDateString() : '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DedicatedMarketSettlement;
