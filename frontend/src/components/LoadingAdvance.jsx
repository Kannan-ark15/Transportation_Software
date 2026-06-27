import React, { useEffect, useMemo, useState } from 'react';
import { vehicleAPI, productAPI, placeAPI, dealerAPI, pumpAPI, driverAPI, loadingAdvanceAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LoadingAdvanceTable from './LoadingAdvanceTable';
import { Loader2 } from 'lucide-react';
const emptyInvoice = { invoice_number: '', place_id: '', to_place: '', dealer_name: '', kt_freight: '', quantity: '' };
const emptyForm = { vehicle_registration_number: '', vehicle_type: '', vehicle_sub_type: '', vehicle_body_type: '', owner_name: '', owner_type: '', product_name: '', invoice_date: '', invoices: [emptyInvoice], driver_bata: '', unloading: '', tarpaulin: '', city_tax: '', maintenance: '', pump_name: '', fuel_litre: '', fuel_rate: '', driver_name: '', driver_loading_advance: '', tds: '' };
const getLastEditedDriverName = (drivers = []) => {
    if (!Array.isArray(drivers) || drivers.length === 0) return '';
    const sorted = [...drivers].sort((a, b) => {
        const aRaw = new Date(a.updated_at || a.created_at || 0).getTime();
        const bRaw = new Date(b.updated_at || b.created_at || 0).getTime();
        const aTs = Number.isFinite(aRaw) ? aRaw : 0;
        const bTs = Number.isFinite(bRaw) ? bRaw : 0;
        return bTs - aTs;
    });
    return sorted[0]?.driver_name || '';
};

const normalizePlaceKey = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const getFromPlaceAliasesForPrefix = (prefix) => {
    const normalizedPrefix = normalizePlaceKey(prefix);
    if (!normalizedPrefix) return [];
    if (normalizedPrefix === 'HOF' || normalizedPrefix === 'HEADOFFICE') return [];
    const map = {
        ARY: ['ARIYALUR', 'ARY'],
        ARIYALUR: ['ARIYALUR', 'ARY'],
        PND: ['ALATHIYUR', 'ALATHIUR', 'PND'],
        ALATHIYUR: ['ALATHIYUR', 'ALATHIUR', 'PND'],
        ALATHIUR: ['ALATHIYUR', 'ALATHIUR', 'PND']
    };
    const aliases = map[normalizedPrefix] || [normalizedPrefix];
    return Array.from(new Set(aliases.map(normalizePlaceKey).filter(Boolean)));
};

const LoadingAdvance = () => {
    const [vehicles, setVehicles] = useState([]), [products, setProducts] = useState([]), [places, setPlaces] = useState([]), [dealers, setDealers] = useState([]), [pumps, setPumps] = useState([]), [drivers, setDrivers] = useState([]), [form, setForm] = useState(emptyForm), [loading, setLoading] = useState(true), [submitting, setSubmitting] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(''), [lastSaved, setLastSaved] = useState(null), [voucherDisplay, setVoucherDisplay] = useState('Loading...'), [now] = useState(() => new Date().toLocaleString()), [modalOpen, setModalOpen] = useState(false), [refreshKey, setRefreshKey] = useState(0);
    const loginPrefix = (() => { try { return JSON.parse(localStorage.getItem('auth_user') || '{}')?.login_prefix; } catch { return undefined; } })();
    const isContainer = String(form.vehicle_body_type || '').toLowerCase().includes('container');
    const sumIfas = form.invoices.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.kt_freight) || 0), 0);
    const driverBata = Number(form.driver_bata) || 0;
    const unloadingCharges = Number(form.unloading) || 0;
    const tarpaulinVal = isContainer ? 0 : (Number(form.tarpaulin) || 0);
    const cityTax = Number(form.city_tax) || 0;
    const maintenance = Number(form.maintenance) || 0;
    const expenseSum = driverBata + unloadingCharges + tarpaulinVal + cityTax + maintenance;
    const ownerType = String(form.owner_type || '').toLowerCase(), isDedicated = ownerType === 'dedicated', isCommissioned = isDedicated || ownerType === 'market', commissionPct = isCommissioned ? 6 : 0;
    const commissionAmt = isCommissioned ? Math.ceil((sumIfas * commissionPct) / 100) : 0;
    const grossAmountVal = isCommissioned ? (commissionAmt - expenseSum) : (sumIfas - expenseSum);

    const predefinedExpenses = (commissionAmt + unloadingCharges + tarpaulinVal + cityTax + maintenance).toFixed(2);
    const fuelAmountVal = (Number(form.fuel_litre) || 0) * (Number(form.fuel_rate) || 0), fuelAmount = fuelAmountVal.toFixed(2);
    const tdsAmount = Number(form.tds) || 0;
    const tripBalance = (sumIfas - (commissionAmt + (Number(form.driver_loading_advance) || 0) + fuelAmountVal + tdsAmount)).toFixed(2);
    const defaultDriverName = getLastEditedDriverName(drivers);
    const fromPlaceAliases = useMemo(() => getFromPlaceAliasesForPrefix(loginPrefix), [loginPrefix]);
    const placesById = useMemo(() => {
        const byId = new Map();
        for (const place of places) byId.set(String(place.id), place);
        return byId;
    }, [places]);
    const placeOptions = (product) => {
        const productPlaces = product ? places.filter(p => p.product_name === product) : places;
        const filtered = fromPlaceAliases.length ? productPlaces.filter((p) => fromPlaceAliases.includes(normalizePlaceKey(p.from_place))) : productPlaces;
        const seen = new Set();
        return filtered.filter(p => {
            const key = normalizePlaceKey(p.to_place);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };
    const dealerOptions = (placeId) => {
        if (!placeId) return [];
        const selectedPlace = placesById.get(String(placeId));
        if (!selectedPlace) return [];
        const toPlaceKey = normalizePlaceKey(selectedPlace.to_place);
        const seenDealer = new Set();
        const options = [];
        for (const dealer of dealers) {
            const dealerPlace = placesById.get(String(dealer.place_id));
            if (!dealerPlace) continue;
            if (normalizePlaceKey(dealerPlace.to_place) !== toPlaceKey) continue;
            const dealerKey = String(dealer.dealer_name || '').trim().toLowerCase();
            if (!dealerKey || seenDealer.has(dealerKey)) continue;
            seenDealer.add(dealerKey);
            options.push(dealer);
        }
        return options;
    };
    const fetchNextVoucher = async () => { if (!loginPrefix) return setVoucherDisplay('Auto generated'); try { const res = await loadingAdvanceAPI.getNextVoucher(loginPrefix); setVoucherDisplay(res.success ? res.data.voucher_number : 'Auto generated'); } catch { setVoucherDisplay('Auto generated'); } };
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [vRes, pRes, plRes, dRes, puRes, drRes] = await Promise.all([
                    vehicleAPI.getAll(),
                    productAPI.getAll(),
                    placeAPI.getAll(),
                    dealerAPI.getAll(),
                    pumpAPI.getAll(),
                    driverAPI.getAll()
                ]);
                if (vRes.success) setVehicles(vRes.data);
                if (pRes.success) setProducts(pRes.data);
                if (plRes.success) setPlaces(plRes.data);
                if (dRes.success) setDealers(dRes.data);
                if (puRes.success) setPumps(puRes.data);
                if (drRes.success) {
                    setDrivers(drRes.data);
                    const lastEditedDriver = getLastEditedDriverName(drRes.data);
                    if (lastEditedDriver) {
                        setForm((f) => ({ ...f, driver_name: f.driver_name || lastEditedDriver }));
                    }
                }
            } catch {
                setError('Failed to load masters');
            } finally {
                setLoading(false);
            }
        };
        load();
        fetchNextVoucher();
    }, []);
    const onVehicleChange = (vehicleNo) => { const v = vehicles.find(x => x.vehicle_no === vehicleNo); if (!v) return; const ot = v.own_dedicated || v.owner_type || ''; const otLower = String(ot).toLowerCase(); setForm(f => ({ ...f, vehicle_registration_number: vehicleNo, vehicle_type: v.vehicle_type || '', vehicle_sub_type: v.vehicle_sub_type || '', vehicle_body_type: v.vehicle_body_type || '', owner_name: v.owner_name || '', owner_type: ot, driver_name: (otLower === 'dedicated' || otLower === 'market') ? '' : (f.driver_name || defaultDriverName) })); };
    const updateInvoice = (idx, patch) => setForm(f => ({ ...f, invoices: f.invoices.map((inv, i) => i === idx ? { ...inv, ...patch } : inv) }));
    const addInvoice = () => setForm(f => ({ ...f, invoices: [...f.invoices, emptyInvoice] }));
    const removeInvoice = (idx) => setForm(f => ({ ...f, invoices: f.invoices.filter((_, i) => i !== idx) }));
    const onProductChange = (val) => setForm(f => ({ ...f, product_name: val, invoices: [emptyInvoice], driver_bata: '', unloading: '', tarpaulin: '', city_tax: '', maintenance: '' }));
    const onPlaceChange = async (idx, placeId) => { const place = places.find(p => String(p.id) === String(placeId)); updateInvoice(idx, { place_id: placeId, to_place: place?.to_place || '', dealer_name: '' }); try { const res = await placeAPI.getById(placeId); const cards = res.success ? (res.data.rate_cards || []) : []; const vt = form.vehicle_type, vst = form.vehicle_sub_type, vbt = form.vehicle_body_type; const match = cards.find(rc => rc.vehicle_type === vt && rc.vehicle_sub_type === vst && rc.vehicle_body_type === vbt) || cards[0]; if (match) { updateInvoice(idx, { kt_freight: match.kt_freight ?? '' }); setForm(f => ({ ...f, driver_bata: match.driver_bata ?? f.driver_bata, unloading: match.unloading ?? f.unloading, tarpaulin: String(vbt || '').toLowerCase().includes('container') ? 0 : (match.tarpaulin ?? f.tarpaulin), city_tax: match.city_tax ?? f.city_tax, maintenance: match.maintenance ?? f.maintenance, driver_loading_advance: f.driver_loading_advance || match.advance || '' })); } } catch { } };

    const onPumpChange = (val) => { const p = pumps.find(x => x.pump_name === val); setForm(f => ({ ...f, pump_name: val, fuel_rate: p?.rate ?? f.fuel_rate })); };
    const isEmpty = (v) => v === '' || v === null || v === undefined;
    const handleSubmit = async (e) => { e.preventDefault(); setError(''); setSuccess(''); const baseRequired = isEmpty(form.vehicle_registration_number) || isEmpty(form.product_name) || isEmpty(form.invoice_date) || isEmpty(form.driver_bata) || isEmpty(form.unloading); const fuelRequired = !isDedicated && (isEmpty(form.pump_name) || isEmpty(form.fuel_litre) || isEmpty(form.fuel_rate)); const advanceRequired = !isDedicated && isEmpty(form.driver_loading_advance); if (baseRequired || fuelRequired || advanceRequired) return setError('Please fill all mandatory fields'); if (!isCommissioned && isEmpty(form.driver_name)) return setError('Driver name is required'); if (form.invoices.some(i => isEmpty(i.invoice_number) || isEmpty(i.to_place) || isEmpty(i.dealer_name) || isEmpty(i.quantity) || isEmpty(i.kt_freight))) return setError('Please fill all invoice fields'); try { setSubmitting(true); const invoices = form.invoices.map(i => ({ ...i, ifa_amount: (Number(i.quantity) || 0) * (Number(i.kt_freight) || 0) })); const res = await loadingAdvanceAPI.create({ ...form, invoices, commission_pct: commissionPct, login_prefix: loginPrefix }); if (res.success) { setSuccess(`Saved voucher ${res.data.voucher_number}`); setLastSaved(res.data); setForm({ ...emptyForm, driver_name: defaultDriverName }); fetchNextVoucher(); setRefreshKey(k => k + 1); } } catch (err) { setError(err.response?.data?.message || 'Save failed'); } finally { setSubmitting(false); } };
    const inputClassName = 'h-7 px-2 text-[11px]';
    const selectTriggerClassName = 'h-7 px-2 text-[11px]';
    const fieldWrapClassName = 'space-y-0.5';
    const fieldLabelClassName = 'text-[10px] font-medium leading-3.5';
    const sectionGridClassName = 'grid grid-cols-1 gap-2 md:grid-cols-2 md:items-start';
    const sectionPaneClassName = 'space-y-2 rounded-md border border-slate-100 p-2.5';
    if (loading) return (<div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500"><Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" /><p className="text-base font-medium">Loading masters...</p></div>);
    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">Add Loading Balance</Button>
            </div>
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="min-w-0 w-[96vw] max-w-[1480px] max-h-[92vh] overflow-x-hidden overflow-y-auto p-3">
                    <DialogHeader>
                        <DialogTitle>Loading Advance</DialogTitle>
                    </DialogHeader>
                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}
                    {success && <div className="p-3 bg-green-50 text-green-600 rounded-md text-sm">{success}</div>}
                    <form onSubmit={handleSubmit} className="space-y-2.5">
                        <div className="grid gap-2.5 xl:grid-cols-2">
                            <Card className="border border-slate-100 shadow-none">
                                <CardHeader className="pb-2 bg-accent/10 border-b border-accent/20 rounded-t-lg">
                                    <CardTitle className="text-sm text-accent">Trip & Voucher Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 p-3">
                                    <div className={sectionGridClassName}>
                                        <div className={sectionPaneClassName}>
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Manual Entry</p>
                                            <div className={fieldWrapClassName}><Label className={`${fieldLabelClassName} required`}>Vehicle Registration Number</Label><Select value={form.vehicle_registration_number} onValueChange={onVehicleChange}><SelectTrigger className={selectTriggerClassName}><SelectValue placeholder="Select vehicle" /></SelectTrigger><SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.vehicle_no}>{v.vehicle_no}</SelectItem>)}</SelectContent></Select></div>
                                            <div className={fieldWrapClassName}><Label className={`${fieldLabelClassName} required`}>Product Name</Label><Select value={form.product_name} onValueChange={onProductChange}><SelectTrigger className={selectTriggerClassName}><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{products.map(p => <SelectItem key={p.id} value={p.product_name}>{p.product_name}</SelectItem>)}</SelectContent></Select></div>
                                            <div className={fieldWrapClassName}><Label className={`${fieldLabelClassName} required`}>Invoice Date</Label><Input className={inputClassName} type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} /></div>
                                        </div>
                                        <div className={sectionPaneClassName}>
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Loaded Details</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>Voucher Number</Label><Input className={inputClassName} disabled value={voucherDisplay} /></div>
                                                <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>Voucher Date & Time</Label><Input className={inputClassName} disabled value={now} /></div>
                                                {[['Vehicle Type', form.vehicle_type], ['Vehicle Sub Type', form.vehicle_sub_type], ['Vehicle Body Type', form.vehicle_body_type], ['Owner Name', form.owner_name], ['Owner Type', form.owner_type]].map(([l, v]) => (
                                                    <div key={l} className={fieldWrapClassName}>
                                                        <Label className={fieldLabelClassName}>{l}</Label>
                                                        <Input className={inputClassName} disabled value={v || ''} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border border-slate-100 shadow-none">
                                <CardHeader className="pb-2 bg-accent/10 border-b border-accent/20 rounded-t-lg">
                                    <CardTitle className="text-sm text-accent">Invoice Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 p-3">
                                    {form.invoices.map((inv, idx) => (
                                        <div key={idx} className="space-y-2 rounded-lg border border-slate-100 p-2.5">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Invoice {idx + 1}</p>
                                                {form.invoices.length > 1 && <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => removeInvoice(idx)}>Remove</Button>}
                                            </div>
                                            <div className={sectionGridClassName}>
                                                <div className={sectionPaneClassName}>
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Manual Entry</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className={fieldWrapClassName}><Label className={`${fieldLabelClassName} required`}>Invoice Number</Label><Input className={inputClassName} value={inv.invoice_number} onChange={e => updateInvoice(idx, { invoice_number: e.target.value })} /></div>
                                                        <div className={fieldWrapClassName}><Label className={`${fieldLabelClassName} required`}>To Place</Label><Select value={inv.place_id} onValueChange={(v) => onPlaceChange(idx, v)}><SelectTrigger className={selectTriggerClassName}><SelectValue placeholder="Select place" /></SelectTrigger><SelectContent>{placeOptions(form.product_name).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.to_place}</SelectItem>)}</SelectContent></Select></div>
                                                        <div className={fieldWrapClassName}><Label className={`${fieldLabelClassName} required`}>Dealer Name</Label><Select value={inv.dealer_name} onValueChange={v => updateInvoice(idx, { dealer_name: v })}><SelectTrigger className={selectTriggerClassName}><SelectValue placeholder="Select dealer" /></SelectTrigger><SelectContent>{dealerOptions(inv.place_id).map(d => <SelectItem key={d.id} value={d.dealer_name}>{d.dealer_name}</SelectItem>)}</SelectContent></Select></div>
                                                        <div className={fieldWrapClassName}><Label className={`${fieldLabelClassName} required`}>Quantity</Label><Input className={inputClassName} type="number" step="0.001" value={inv.quantity} onChange={e => updateInvoice(idx, { quantity: e.target.value })} /></div>
                                                    </div>
                                                </div>
                                                <div className={sectionPaneClassName}>
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Loaded Details</p>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>IFA (Invoice Freight Amount)</Label><Input className={inputClassName} disabled value={((Number(inv.quantity) || 0) * (Number(inv.kt_freight) || 0)).toFixed(2)} /></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <Button type="button" variant="secondary" size="sm" className="h-7 px-2.5 text-[11px]" onClick={addInvoice}>Add Invoice</Button>
                                </CardContent>
                            </Card>

                            <Card className="border border-slate-100 shadow-none">
                                <CardHeader className="pb-2 bg-accent/10 border-b border-accent/20 rounded-t-lg">
                                    <CardTitle className="text-sm text-accent">Charges & Predefined Trip Expenses</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 p-3">
                                    <div className={sectionGridClassName}>
                                        <div className={sectionPaneClassName}>
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Manual Entry</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className={fieldWrapClassName}><Label className={`${fieldLabelClassName} required`}>Driver Bata</Label><Input className={inputClassName} type="number" step="0.01" value={form.driver_bata} onChange={e => setForm(f => ({ ...f, driver_bata: e.target.value }))} /></div>
                                                <div className={fieldWrapClassName}><Label className={`${fieldLabelClassName} required`}>Unloading Charges</Label><Input className={inputClassName} type="number" step="0.01" value={form.unloading} onChange={e => setForm(f => ({ ...f, unloading: e.target.value }))} /></div>
                                                <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>Tarpaulin</Label><Input className={inputClassName} type="number" step="0.01" disabled={isContainer} value={isContainer ? 0 : form.tarpaulin} onChange={e => setForm(f => ({ ...f, tarpaulin: e.target.value }))} /></div>
                                                <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>City Tax</Label><Input className={inputClassName} type="number" step="0.01" value={form.city_tax} onChange={e => setForm(f => ({ ...f, city_tax: e.target.value }))} /></div>
                                                <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>Maintenance</Label><Input className={inputClassName} type="number" step="0.01" value={form.maintenance} onChange={e => setForm(f => ({ ...f, maintenance: e.target.value }))} /></div>
                                            </div>
                                        </div>
                                        <div className={sectionPaneClassName}>
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Loaded Details</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>Sum of all IFAs</Label><Input className={inputClassName} disabled value={sumIfas.toFixed(2)} /></div>
                                                <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>Commission %</Label><Input className={inputClassName} disabled value={commissionPct.toFixed(0)} /></div>
                                                <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>Commission Amount</Label><Input className={inputClassName} disabled value={commissionAmt.toFixed(0)} /></div>
                                                <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>Predefined Expenses</Label><Input className={inputClassName} disabled value={predefinedExpenses} /></div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border border-slate-100 shadow-none">
                                <CardHeader className="pb-2 bg-accent/10 border-b border-accent/20 rounded-t-lg">
                                    <CardTitle className="text-sm text-accent">Fuel, Driver & Trip Financial Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 p-3">
                                    <div className={sectionGridClassName}>
                                        <div className={sectionPaneClassName}>
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Manual Entry</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className={fieldWrapClassName}><Label className={`${fieldLabelClassName} ${isDedicated ? '' : 'required'}`}>Pump Name</Label><Select value={form.pump_name} onValueChange={onPumpChange}><SelectTrigger className={selectTriggerClassName}><SelectValue placeholder="Select pump" /></SelectTrigger><SelectContent>{pumps.map(p => <SelectItem key={p.id} value={p.pump_name}>{p.pump_name}</SelectItem>)}</SelectContent></Select></div>
                                                <div className={fieldWrapClassName}><Label className={`${fieldLabelClassName} ${isDedicated ? '' : 'required'}`}>Fuel Litre</Label><Input className={inputClassName} type="number" step="0.01" value={form.fuel_litre} onChange={e => setForm(f => ({ ...f, fuel_litre: e.target.value }))} /></div>
                                                <div className={fieldWrapClassName}><Label className={`${fieldLabelClassName} ${isDedicated ? '' : 'required'}`}>Fuel Rate</Label><Input className={inputClassName} type="number" step="0.01" value={form.fuel_rate} onChange={e => setForm(f => ({ ...f, fuel_rate: e.target.value }))} /></div>
                                                {isDedicated ? (
                                                    <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>Driver Name</Label><Input className={inputClassName} placeholder="Type driver name" value={form.driver_name} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} /></div>
                                                ) : (
                                                    <div className={fieldWrapClassName}><Label className={`${fieldLabelClassName} ${isCommissioned ? '' : 'required'}`}>Driver Name</Label><Select value={form.driver_name} onValueChange={v => setForm(f => ({ ...f, driver_name: v }))} disabled={isCommissioned}><SelectTrigger className={selectTriggerClassName}><SelectValue placeholder="Select driver" /></SelectTrigger><SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.driver_name}>{d.driver_name}</SelectItem>)}</SelectContent></Select></div>
                                                )}
                                                <div className={fieldWrapClassName}><Label className={`${fieldLabelClassName} ${isDedicated ? '' : 'required'}`}>Driver Loading Advance</Label><Input className={inputClassName} type="number" step="0.01" value={form.driver_loading_advance} onChange={e => setForm(f => ({ ...f, driver_loading_advance: e.target.value }))} /></div>
                                                <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>TDS</Label><Input className={inputClassName} type="number" step="0.01" value={form.tds} onChange={e => setForm(f => ({ ...f, tds: e.target.value }))} /></div>
                                            </div>
                                        </div>
                                        <div className={sectionPaneClassName}>
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Loaded Details</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>Fuel Amount</Label><Input className={inputClassName} disabled value={fuelAmount} /></div>
                                                <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>Trip Balance</Label><Input className={inputClassName} disabled value={tripBalance} /></div>
                                                <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>Owner Type</Label><Input className={inputClassName} disabled value={form.owner_type || ''} /></div>
                                                <div className={fieldWrapClassName}><Label className={fieldLabelClassName}>Gross Amount</Label><Input className={inputClassName} disabled value={grossAmountVal.toFixed(2)} /></div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <Button type="button" variant="outline" className="h-7 px-2.5 text-[11px]" onClick={() => { setForm({ ...emptyForm, driver_name: defaultDriverName }); fetchNextVoucher(); }} disabled={submitting}>Clear</Button>
                            <Button type="submit" className="h-7 px-2.5 text-[11px]" disabled={submitting}>{submitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Save</Button>
                        </div>
                    </form>
                    {lastSaved && <div className="text-xs text-slate-500">Last saved: {lastSaved.voucher_number} on {new Date(lastSaved.voucher_datetime).toLocaleString()}</div>}
                </DialogContent>
            </Dialog>
            <LoadingAdvanceTable refreshKey={refreshKey} />
        </div>
    );
};
export default LoadingAdvance;
