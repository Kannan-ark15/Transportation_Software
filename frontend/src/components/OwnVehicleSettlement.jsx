import React, { useEffect, useMemo, useState } from 'react';
import { ownVehicleSettlementAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, WalletCards, SearchX, CheckCircle2 } from 'lucide-react';

const ALL_VEHICLES = '__ALL_VEHICLES__';

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const defaultManualFields = {
    parking_charges: '0',
    expenditure_1: '0',
    expenditure_2: '0',
    expenditure_3: '0'
};

const OwnVehicleSettlement = () => {
    const [drivers, setDrivers] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [readyVouchers, setReadyVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [search, setSearch] = useState('');

    const [form, setForm] = useState({
        driver_id: '',
        cash_bank: 'Cash',
        bank_name: '',
        branch: '',
        account_number: '',
        ifsc_code: '',
        vehicle_number: ''
    });
    const [selectedVoucherIds, setSelectedVoucherIds] = useState([]);
    const [manualFieldsByAck, setManualFieldsByAck] = useState({});

    const selectedDriver = useMemo(
        () => drivers.find(d => String(d.id) === String(form.driver_id)) || null,
        [drivers, form.driver_id]
    );

    const vehicleOptions = useMemo(
        () => [...new Set(readyVouchers.map(v => v.vehicle_number).filter(Boolean))],
        [readyVouchers]
    );

    const selectedVouchers = useMemo(
        () => readyVouchers.filter(v => selectedVoucherIds.includes(v.acknowledgement_id)),
        [readyVouchers, selectedVoucherIds]
    );

    const getManualFields = (ackId) => manualFieldsByAck[ackId] || defaultManualFields;

    const getDriverBalance = (row) => {
        const manual = getManualFields(row.acknowledgement_id);
        const totalExpenses =
            toNumber(row.unloading) +
            toNumber(row.tarpaulin) +
            toNumber(row.city_tax) +
            toNumber(row.maintenance) +
            toNumber(manual.parking_charges) +
            toNumber(manual.expenditure_1) +
            toNumber(manual.expenditure_2) +
            toNumber(manual.expenditure_3) +
            toNumber(row.fuel_amount);

        return Number((toNumber(row.driver_loading_advance) - totalExpenses).toFixed(2));
    };

    const totalDriverBata = useMemo(
        () => Number(selectedVouchers.reduce((sum, row) => sum + toNumber(row.driver_bata), 0).toFixed(2)),
        [selectedVouchers]
    );

    const totalDriverBalance = useMemo(
        () => Number(selectedVouchers.reduce((sum, row) => sum + getDriverBalance(row), 0).toFixed(2)),
        [selectedVouchers, manualFieldsByAck]
    );

    const driverSalaryPayable = useMemo(
        () => Number((totalDriverBata - totalDriverBalance).toFixed(2)),
        [totalDriverBata, totalDriverBalance]
    );

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [driversRes, settlementsRes] = await Promise.all([
                    ownVehicleSettlementAPI.getDrivers(),
                    ownVehicleSettlementAPI.getAll()
                ]);
                if (driversRes.success) setDrivers(driversRes.data);
                if (settlementsRes.success) setSettlements(settlementsRes.data);
            } catch (err) {
                setError('Failed to load own vehicle settlement data');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const loadReadyVouchers = async (driverId, vehicleNumber = null) => {
        try {
            const res = await ownVehicleSettlementAPI.getReadyVouchers({
                driver_id: driverId,
                vehicle_number: vehicleNumber || undefined
            });
            if (res.success) {
                setReadyVouchers(res.data);
                setSelectedVoucherIds([]);
                const seed = {};
                for (const row of res.data) seed[row.acknowledgement_id] = { ...defaultManualFields };
                setManualFieldsByAck(seed);
            }
        } catch (err) {
            setError('Failed to load settlement-ready vouchers');
            setReadyVouchers([]);
            setSelectedVoucherIds([]);
            setManualFieldsByAck({});
        }
    };

    const loadSettlements = async () => {
        const res = await ownVehicleSettlementAPI.getAll();
        if (res.success) setSettlements(res.data);
    };

    const onDriverChange = async (driverId) => {
        const driver = drivers.find(d => String(d.id) === String(driverId));
        setForm(prev => ({
            ...prev,
            driver_id: driverId,
            vehicle_number: '',
            bank_name: prev.cash_bank === 'Bank' ? (driver?.bank_name || '') : '',
            branch: prev.cash_bank === 'Bank' ? (driver?.branch || '') : '',
            account_number: prev.cash_bank === 'Bank' ? (driver?.account_number || '') : '',
            ifsc_code: prev.cash_bank === 'Bank' ? (driver?.ifsc_code || '') : ''
        }));
        await loadReadyVouchers(driverId, null);
    };

    const onCashBankChange = (mode) => {
        const driver = selectedDriver;
        setForm(prev => ({
            ...prev,
            cash_bank: mode,
            bank_name: mode === 'Bank' ? (driver?.bank_name || '') : '',
            branch: mode === 'Bank' ? (driver?.branch || '') : '',
            account_number: mode === 'Bank' ? (driver?.account_number || '') : '',
            ifsc_code: mode === 'Bank' ? (driver?.ifsc_code || '') : ''
        }));
    };

    const onVehicleFilterChange = async (vehicleNumber) => {
        const normalizedVehicleNumber = vehicleNumber === ALL_VEHICLES ? '' : vehicleNumber;
        setForm(prev => ({ ...prev, vehicle_number: normalizedVehicleNumber }));
        if (form.driver_id) await loadReadyVouchers(form.driver_id, normalizedVehicleNumber || null);
    };

    const toggleVoucherSelection = (ackId) => {
        setSelectedVoucherIds(prev =>
            prev.includes(ackId) ? prev.filter(id => id !== ackId) : [...prev, ackId]
        );
    };

    const updateManualField = (ackId, field, value) => {
        setManualFieldsByAck(prev => ({
            ...prev,
            [ackId]: {
                ...(prev[ackId] || defaultManualFields),
                [field]: value
            }
        }));
    };

    const validate = () => {
        if (!form.driver_id) return 'Driver Name is required';
        if (!form.cash_bank) return 'Cash / Bank is required';
        if (selectedVoucherIds.length === 0) return 'Select at least one settlement-ready voucher';
        if (form.cash_bank === 'Bank' && (!form.bank_name || !form.branch || !form.account_number || !form.ifsc_code)) {
            return 'Bank details are required when Cash / Bank is Bank';
        }

        for (const row of selectedVouchers) {
            const manual = getManualFields(row.acknowledgement_id);
            const fields = ['parking_charges', 'expenditure_1', 'expenditure_2', 'expenditure_3'];
            for (const field of fields) {
                const value = toNumber(manual[field], NaN);
                if (!Number.isFinite(value) || value < 0) {
                    return `Invalid value for ${field.replace('_', ' ')} in voucher ${row.voucher_number}`;
                }
            }
        }
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
                driver_id: Number(form.driver_id),
                cash_bank: form.cash_bank,
                bank_name: form.cash_bank === 'Bank' ? form.bank_name : null,
                branch: form.cash_bank === 'Bank' ? form.branch : null,
                account_number: form.cash_bank === 'Bank' ? form.account_number : null,
                ifsc_code: form.cash_bank === 'Bank' ? form.ifsc_code : null,
                selected_vouchers: selectedVouchers.map(v => {
                    const manual = getManualFields(v.acknowledgement_id);
                    return {
                        acknowledgement_id: v.acknowledgement_id,
                        parking_charges: Number(toNumber(manual.parking_charges, 0).toFixed(2)),
                        expenditure_1: Number(toNumber(manual.expenditure_1, 0).toFixed(2)),
                        expenditure_2: Number(toNumber(manual.expenditure_2, 0).toFixed(2)),
                        expenditure_3: Number(toNumber(manual.expenditure_3, 0).toFixed(2))
                    };
                })
            };

            const res = await ownVehicleSettlementAPI.create(payload);
            if (res.success) {
                setSuccessMsg('Own vehicle settlement saved successfully');
                await loadReadyVouchers(form.driver_id, form.vehicle_number || null);
                await loadSettlements();
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
            String(row.driver_name || '').toLowerCase().includes(q) ||
            String(row.voucher_numbers || '').toLowerCase().includes(q)
        );
    }, [settlements, search]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <p className="text-base font-medium">Loading own vehicle balance settlement...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <WalletCards className="w-6 h-6 text-blue-600" />
                        Own Vehicles
                    </CardTitle>
                    <p className="text-sm text-slate-500">Driver Balance Settlement</p>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-md text-sm">{error}</div>}
                    {successMsg && <div className="p-3 bg-green-50 border border-green-100 text-green-600 rounded-md text-sm">{successMsg}</div>}

                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Driver Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label className="required">Driver Name</Label>
                                <Select value={form.driver_id} onValueChange={onDriverChange}>
                                    <SelectTrigger><SelectValue placeholder="Select active driver" /></SelectTrigger>
                                    <SelectContent>
                                        {drivers.map(driver => (
                                            <SelectItem key={driver.id} value={String(driver.id)}>
                                                {driver.driver_name} ({driver.driver_id})
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
                                    <Input value={form.account_number} onChange={e => setForm(prev => ({ ...prev, account_number: e.target.value }))} />
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
                                <Select value={form.vehicle_number || ALL_VEHICLES} onValueChange={onVehicleFilterChange} disabled={!form.driver_id}>
                                    <SelectTrigger><SelectValue placeholder="All Vehicles" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL_VEHICLES}>All Vehicles</SelectItem>
                                        {vehicleOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="rounded-md border border-slate-100 overflow-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/60">
                                    <TableRow>
                                        <TableHead>Select</TableHead>
                                        <TableHead>Vehicle Number</TableHead>
                                        <TableHead>Voucher Number</TableHead>
                                        <TableHead>Sum IFAs</TableHead>
                                        <TableHead>Driver Bata</TableHead>
                                        <TableHead>Unloading</TableHead>
                                        <TableHead>Tarpaulin</TableHead>
                                        <TableHead>City Tax</TableHead>
                                        <TableHead>Maintenance</TableHead>
                                        <TableHead>Parking Charges</TableHead>
                                        <TableHead>Expenditure 1</TableHead>
                                        <TableHead>Expenditure 2</TableHead>
                                        <TableHead>Expenditure 3</TableHead>
                                        <TableHead>Fuel Amount</TableHead>
                                        <TableHead>Driver Loading Advance</TableHead>
                                        <TableHead>Driver Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {readyVouchers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={16} className="text-center text-sm text-slate-400 py-6">
                                                No ready-for-settlement vouchers available for this driver.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        readyVouchers.map(row => {
                                            const selected = selectedVoucherIds.includes(row.acknowledgement_id);
                                            const manual = getManualFields(row.acknowledgement_id);
                                            return (
                                                <TableRow key={row.acknowledgement_id}>
                                                    <TableCell>
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={() => toggleVoucherSelection(row.acknowledgement_id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{row.vehicle_number}</TableCell>
                                                    <TableCell className="font-medium">{row.voucher_number}</TableCell>
                                                    <TableCell>{toNumber(row.sum_ifas).toFixed(2)}</TableCell>
                                                    <TableCell>{toNumber(row.driver_bata).toFixed(2)}</TableCell>
                                                    <TableCell>{toNumber(row.unloading).toFixed(2)}</TableCell>
                                                    <TableCell>{toNumber(row.tarpaulin).toFixed(2)}</TableCell>
                                                    <TableCell>{toNumber(row.city_tax).toFixed(2)}</TableCell>
                                                    <TableCell>{toNumber(row.maintenance).toFixed(2)}</TableCell>
                                                    <TableCell className="min-w-[130px]">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            disabled={!selected}
                                                            value={manual.parking_charges}
                                                            onChange={e => updateManualField(row.acknowledgement_id, 'parking_charges', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="min-w-[130px]">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            disabled={!selected}
                                                            value={manual.expenditure_1}
                                                            onChange={e => updateManualField(row.acknowledgement_id, 'expenditure_1', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="min-w-[130px]">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            disabled={!selected}
                                                            value={manual.expenditure_2}
                                                            onChange={e => updateManualField(row.acknowledgement_id, 'expenditure_2', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="min-w-[130px]">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            disabled={!selected}
                                                            value={manual.expenditure_3}
                                                            onChange={e => updateManualField(row.acknowledgement_id, 'expenditure_3', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{toNumber(row.fuel_amount).toFixed(2)}</TableCell>
                                                    <TableCell>{toNumber(row.driver_loading_advance).toFixed(2)}</TableCell>
                                                    <TableCell>{selected ? getDriverBalance(row).toFixed(2) : '-'}</TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <Label>Total Driver Bata</Label>
                                <Input disabled value={totalDriverBata.toFixed(2)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Total Driver Balance</Label>
                                <Input disabled value={totalDriverBalance.toFixed(2)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Driver Salary Payable</Label>
                                <Input disabled value={driverSalaryPayable.toFixed(2)} />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleSettled} disabled={submitting || !form.driver_id}>
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
                                placeholder="Search by driver / voucher number"
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
                                        <TableHead>Driver</TableHead>
                                        <TableHead>Mode</TableHead>
                                        <TableHead>Vehicle Number</TableHead>
                                        <TableHead>Voucher Number</TableHead>
                                        <TableHead>Total Driver Bata</TableHead>
                                        <TableHead>Total Driver Balance</TableHead>
                                        <TableHead>Driver Salary Payable</TableHead>
                                        <TableHead>Settled Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSettlements.map((row, index) => (
                                        <TableRow key={row.id} className="hover:bg-slate-50/40">
                                            <TableCell className="text-xs text-slate-500">{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{row.driver_name}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{row.cash_bank}</Badge>
                                            </TableCell>
                                            <TableCell>{row.vehicle_numbers || '-'}</TableCell>
                                            <TableCell>{row.voucher_numbers || '-'}</TableCell>
                                            <TableCell>{toNumber(row.total_driver_bata).toFixed(2)}</TableCell>
                                            <TableCell>{toNumber(row.total_driver_balance).toFixed(2)}</TableCell>
                                            <TableCell>{toNumber(row.driver_salary_payable).toFixed(2)}</TableCell>
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

export default OwnVehicleSettlement;

