import React, { useEffect, useState } from 'react';
import { vehicleAPI, productAPI, placeAPI, dealerAPI, bankAPI, pumpAPI, driverAPI, loadingAdvanceAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LoadingAdvanceTable from './LoadingAdvanceTable';
import { Loader2 } from 'lucide-react';
const emptyInvoice = { invoice_number: '', place_id: '', to_place: '', dealer_name: '', distance_km: '', kt_freight: '', quantity: '' };
const emptyForm = { vehicle_registration_number: '', vehicle_type: '', vehicle_sub_type: '', vehicle_body_type: '', owner_name: '', owner_type: '', product_name: '', invoice_date: '', invoices: [emptyInvoice], driver_bata: '', unloading: '', tarpaulin: '', city_tax: '', maintenance: '', cash_bank: 'Cash', bank_id: '', pump_name: '', fuel_litre: '', fuel_rate: '', driver_name: '', driver_loading_advance: '' };
const LoadingAdvance = () => {
    const [vehicles, setVehicles] = useState([]), [products, setProducts] = useState([]), [places, setPlaces] = useState([]), [dealers, setDealers] = useState([]), [banks, setBanks] = useState([]), [pumps, setPumps] = useState([]), [drivers, setDrivers] = useState([]), [form, setForm] = useState(emptyForm), [loading, setLoading] = useState(true), [submitting, setSubmitting] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(''), [lastSaved, setLastSaved] = useState(null), [voucherDisplay, setVoucherDisplay] = useState('Loading...'), [now] = useState(() => new Date().toLocaleString()), [modalOpen, setModalOpen] = useState(false), [refreshKey, setRefreshKey] = useState(0);
    const loginPrefix = (() => { try { return JSON.parse(localStorage.getItem('auth_user') || '{}')?.login_prefix; } catch { return undefined; } })();
    const isContainer = String(form.vehicle_body_type || '').toLowerCase().includes('container');
    const sumIfas = form.invoices.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.kt_freight) || 0), 0);
    const driverBata = Number(form.driver_bata) || 0, unloading = Number(form.unloading) || 0, tarpaulinVal = isContainer ? 0 : (Number(form.tarpaulin) || 0), cityTax = Number(form.city_tax) || 0, maintenance = Number(form.maintenance) || 0;
    const expenseSum = driverBata + unloading + tarpaulinVal + cityTax + maintenance;
    const ownerType = String(form.owner_type || '').toLowerCase(), isCommissioned = ownerType === 'dedicated' || ownerType === 'market', commissionPct = isCommissioned ? 6 : 0;
    const commissionAmt = (sumIfas * commissionPct) / 100;
    const grossAmountVal = isCommissioned ? (commissionAmt - expenseSum) : (sumIfas - expenseSum);
    const grossAmount = grossAmountVal.toFixed(2);
    const predefinedExpenses = (commissionAmt + unloading + tarpaulinVal + cityTax + maintenance).toFixed(2);
    const fuelAmountVal = (Number(form.fuel_litre) || 0) * (Number(form.fuel_rate) || 0), fuelAmount = fuelAmountVal.toFixed(2);
    const tripBalance = ((Number(form.driver_loading_advance) || 0) - fuelAmountVal - grossAmountVal).toFixed(2);
    const placeOptions = (product) => product ? places.filter(p => p.product_name === product) : places;
    const dealerOptions = (placeId) => placeId ? dealers.filter(d => String(d.place_id) === String(placeId)) : [];
    const fetchNextVoucher = async () => { if (!loginPrefix) return setVoucherDisplay('Auto generated'); try { const res = await loadingAdvanceAPI.getNextVoucher(loginPrefix); setVoucherDisplay(res.success ? res.data.voucher_number : 'Auto generated'); } catch { setVoucherDisplay('Auto generated'); } };
    useEffect(() => { const load = async () => { try { setLoading(true); const [vRes, pRes, plRes, dRes, bRes, puRes, drRes] = await Promise.all([vehicleAPI.getAll(), productAPI.getAll(), placeAPI.getAll(), dealerAPI.getAll(), bankAPI.getAll(), pumpAPI.getAll(), driverAPI.getAll()]); if (vRes.success) setVehicles(vRes.data); if (pRes.success) setProducts(pRes.data); if (plRes.success) setPlaces(plRes.data); if (dRes.success) setDealers(dRes.data); if (bRes.success) setBanks(bRes.data); if (puRes.success) setPumps(puRes.data); if (drRes.success) setDrivers(drRes.data); } catch { setError('Failed to load masters'); } finally { setLoading(false); } }; load(); fetchNextVoucher(); }, []);
    const onVehicleChange = (vehicleNo) => { const v = vehicles.find(x => x.vehicle_no === vehicleNo); if (!v) return; const ot = v.own_dedicated || v.owner_type || ''; const otLower = String(ot).toLowerCase(); setForm(f => ({ ...f, vehicle_registration_number: vehicleNo, vehicle_type: v.vehicle_type || '', vehicle_sub_type: v.vehicle_sub_type || '', vehicle_body_type: v.vehicle_body_type || '', owner_name: v.owner_name || '', owner_type: ot, driver_name: (otLower === 'dedicated' || otLower === 'market') ? '' : f.driver_name })); };
    const updateInvoice = (idx, patch) => setForm(f => ({ ...f, invoices: f.invoices.map((inv, i) => i === idx ? { ...inv, ...patch } : inv) }));
    const addInvoice = () => setForm(f => ({ ...f, invoices: [...f.invoices, emptyInvoice] }));
    const removeInvoice = (idx) => setForm(f => ({ ...f, invoices: f.invoices.filter((_, i) => i !== idx) }));
    const onProductChange = (val) => setForm(f => ({ ...f, product_name: val, invoices: [emptyInvoice], driver_bata: '', unloading: '', tarpaulin: '', city_tax: '', maintenance: '', cash_bank: 'Cash', bank_id: '' }));
    const onPlaceChange = async (idx, placeId) => { const place = places.find(p => String(p.id) === String(placeId)); updateInvoice(idx, { place_id: placeId, to_place: place?.to_place || '', distance_km: place?.distance_km || '', dealer_name: '' }); try { const res = await placeAPI.getById(placeId); const cards = res.success ? (res.data.rate_cards || []) : []; const vt = form.vehicle_type, vst = form.vehicle_sub_type, vbt = form.vehicle_body_type; const match = cards.find(rc => rc.vehicle_type === vt && rc.vehicle_sub_type === vst && rc.vehicle_body_type === vbt) || cards[0]; if (match) { updateInvoice(idx, { kt_freight: match.kt_freight ?? '' }); setForm(f => ({ ...f, driver_bata: match.driver_bata ?? f.driver_bata, unloading: match.unloading ?? f.unloading, tarpaulin: String(vbt || '').toLowerCase().includes('container') ? 0 : (match.tarpaulin ?? f.tarpaulin), city_tax: match.city_tax ?? f.city_tax, maintenance: match.maintenance ?? f.maintenance, driver_loading_advance: f.driver_loading_advance || match.advance || '' })); } } catch { } };
    const onCashBankChange = (val) => setForm(f => ({ ...f, cash_bank: val, bank_id: val === 'Bank' ? f.bank_id : '' }));
    const onPumpChange = (val) => { const p = pumps.find(x => x.pump_name === val); setForm(f => ({ ...f, pump_name: val, fuel_rate: p?.rate ?? f.fuel_rate })); };
    const handleSubmit = async (e) => { e.preventDefault(); setError(''); setSuccess(''); if (!form.vehicle_registration_number || !form.product_name || !form.invoice_date || !form.cash_bank || !form.driver_bata || !form.unloading || !form.pump_name || !form.fuel_litre || !form.fuel_rate || !form.driver_loading_advance) return setError('Please fill all mandatory fields'); if (!isCommissioned && !form.driver_name) return setError('Driver name is required'); if (form.invoices.some(i => !i.invoice_number || !i.to_place || !i.dealer_name || !i.quantity || !i.kt_freight)) return setError('Please fill all invoice fields'); if (form.cash_bank === 'Bank' && !form.bank_id) return setError('Please select a bank'); try { setSubmitting(true); const invoices = form.invoices.map(i => ({ ...i, ifa_amount: (Number(i.quantity) || 0) * (Number(i.kt_freight) || 0) })); const res = await loadingAdvanceAPI.create({ ...form, invoices, commission_pct: commissionPct, login_prefix: loginPrefix }); if (res.success) { setSuccess(`Saved voucher ${res.data.voucher_number}`); setLastSaved(res.data); setForm(emptyForm); fetchNextVoucher(); setRefreshKey(k => k + 1); } } catch (err) { setError(err.response?.data?.message || 'Save failed'); } finally { setSubmitting(false); } };
    if (loading) return (<div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500"><Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" /><p className="text-base font-medium">Loading masters...</p></div>);
    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">Add Loading Balance</Button>
            </div>
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Loading Advance</DialogTitle>
                    </DialogHeader>
                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}
                    {success && <div className="p-3 bg-green-50 text-green-600 rounded-md text-sm">{success}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
                        <Card className="border border-slate-100 shadow-none"><CardHeader className="pb-2 bg-accent/10 border-b border-accent/20 rounded-t-lg"><CardTitle className="text-lg text-accent">Trip & Voucher Information</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1"><Label>Voucher Number</Label><Input disabled value={voucherDisplay} /></div>
                                <div className="space-y-1"><Label>Voucher Date & Time</Label><Input disabled value={now} /></div>
                                <div className="space-y-1"><Label className="required">Vehicle Registration Number</Label><Select value={form.vehicle_registration_number} onValueChange={onVehicleChange}><SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger><SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.vehicle_no}>{v.vehicle_no}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-1"><Label className="required">Product Name</Label><Select value={form.product_name} onValueChange={onProductChange}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{products.map(p => <SelectItem key={p.id} value={p.product_name}>{p.product_name}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-1"><Label className="required">Invoice Date</Label><Input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} /></div>
                                {[['Vehicle Type', form.vehicle_type], ['Vehicle Sub Type', form.vehicle_sub_type], ['Vehicle Body Type', form.vehicle_body_type], ['Owner Name', form.owner_name], ['Owner Type', form.owner_type]].map(([l, v]) => (<div key={l} className="space-y-1"><Label>{l}</Label><Input disabled value={v || ''} /></div>))}
                            </CardContent>
                        </Card>
                        <Card className="border border-slate-100 shadow-none"><CardHeader className="pb-2 bg-accent/10 border-b border-accent/20 rounded-t-lg"><CardTitle className="text-lg text-accent">Invoice Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {form.invoices.map((inv, idx) => (
                                    <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg border border-slate-100">
                                        <div className="space-y-1"><Label className="required">Invoice Number</Label><Input value={inv.invoice_number} onChange={e => updateInvoice(idx, { invoice_number: e.target.value })} /></div>
                                        <div className="space-y-1"><Label className="required">To Place</Label><Select value={inv.place_id} onValueChange={(v) => onPlaceChange(idx, v)}><SelectTrigger><SelectValue placeholder="Select place" /></SelectTrigger><SelectContent>{placeOptions(form.product_name).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.to_place}</SelectItem>)}</SelectContent></Select></div>
                                        <div className="space-y-1"><Label className="required">Dealer Name</Label><Select value={inv.dealer_name} onValueChange={v => updateInvoice(idx, { dealer_name: v })}><SelectTrigger><SelectValue placeholder="Select dealer" /></SelectTrigger><SelectContent>{dealerOptions(inv.place_id).map(d => <SelectItem key={d.id} value={d.dealer_name}>{d.dealer_name}</SelectItem>)}</SelectContent></Select></div>
                                        <div className="space-y-1"><Label>Distance in KM</Label><Input disabled value={inv.distance_km || ''} /></div>
                                        <div className="space-y-1"><Label className="required">KT Freight</Label><Input type="number" step="0.01" value={inv.kt_freight} onChange={e => updateInvoice(idx, { kt_freight: e.target.value })} /></div>
                                        <div className="space-y-1"><Label className="required">Quantity</Label><Input type="number" step="0.001" value={inv.quantity} onChange={e => updateInvoice(idx, { quantity: e.target.value })} /></div>
                                        <div className="space-y-1"><Label>IFA (Invoice Freight Amount)</Label><Input disabled value={((Number(inv.quantity) || 0) * (Number(inv.kt_freight) || 0)).toFixed(2)} /></div>
                                        <div className="flex items-end gap-2">{form.invoices.length > 1 && <Button type="button" variant="outline" onClick={() => removeInvoice(idx)}>Remove</Button>}</div>
                                    </div>
                                ))}
                                <Button type="button" variant="secondary" onClick={addInvoice}>Add Invoice</Button>
                            </CardContent>
                        </Card>
                        <Card className="border border-slate-100 shadow-none"><CardHeader className="pb-2 bg-accent/10 border-b border-accent/20 rounded-t-lg"><CardTitle className="text-lg text-accent">Charges & Predefined Trip Expenses</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1"><Label>Sum of all IFAs</Label><Input disabled value={sumIfas.toFixed(2)} /></div>
                                <div className="space-y-1"><Label className="required">Driver Bata</Label><Input type="number" step="0.01" value={form.driver_bata} onChange={e => setForm(f => ({ ...f, driver_bata: e.target.value }))} /></div>
                                <div className="space-y-1"><Label className="required">Unloading</Label><Input type="number" step="0.01" value={form.unloading} onChange={e => setForm(f => ({ ...f, unloading: e.target.value }))} /></div>
                                <div className="space-y-1"><Label>Tarpaulin</Label><Input type="number" step="0.01" disabled={isContainer} value={isContainer ? 0 : form.tarpaulin} onChange={e => setForm(f => ({ ...f, tarpaulin: e.target.value }))} /></div>
                                <div className="space-y-1"><Label>City Tax</Label><Input type="number" step="0.01" value={form.city_tax} onChange={e => setForm(f => ({ ...f, city_tax: e.target.value }))} /></div>
                                <div className="space-y-1"><Label>Maintenance</Label><Input type="number" step="0.01" value={form.maintenance} onChange={e => setForm(f => ({ ...f, maintenance: e.target.value }))} /></div>
                                <div className="space-y-1"><Label className="required">Cash/Bank</Label><Select value={form.cash_bank} onValueChange={onCashBankChange}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{['Cash', 'Bank'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                                {form.cash_bank === 'Bank' && (
                                    <>
                                        <div className="space-y-1"><Label className="required">Bank</Label><Select value={String(form.bank_id || '')} onValueChange={v => setForm(f => ({ ...f, bank_id: v }))}><SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger><SelectContent>{banks.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.bank_name} - {b.account_no}</SelectItem>)}</SelectContent></Select></div>
                                        {(() => { const b = banks.find(x => String(x.id) === String(form.bank_id)); if (!b) return null; return (<><div className="space-y-1"><Label>Branch</Label><Input disabled value={b.branch || ''} /></div><div className="space-y-1"><Label>IFSC</Label><Input disabled value={b.ifsc_code || ''} /></div><div className="space-y-1"><Label>Account No</Label><Input disabled value={b.account_no || ''} /></div></>); })()}
                                    </>
                                )}
                                {commissionPct > 0 && <div className="space-y-1"><Label>Commission (%)</Label><Input disabled value={commissionPct} /></div>}
                                <div className="space-y-1"><Label>Gross Amount</Label><Input disabled value={grossAmount} /></div>
                                <div className="space-y-1"><Label>Predefined Expenses</Label><Input disabled value={predefinedExpenses} /></div>
                            </CardContent>
                        </Card>
                        <Card className="border border-slate-100 shadow-none"><CardHeader className="pb-2 bg-accent/10 border-b border-accent/20 rounded-t-lg"><CardTitle className="text-lg text-accent">Fuel & Pump Details</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1"><Label className="required">Pump Name</Label><Select value={form.pump_name} onValueChange={onPumpChange}><SelectTrigger><SelectValue placeholder="Select pump" /></SelectTrigger><SelectContent>{pumps.map(p => <SelectItem key={p.id} value={p.pump_name}>{p.pump_name}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-1"><Label className="required">Fuel Litre</Label><Input type="number" step="0.01" value={form.fuel_litre} onChange={e => setForm(f => ({ ...f, fuel_litre: e.target.value }))} /></div>
                                <div className="space-y-1"><Label className="required">Fuel Rate</Label><Input type="number" step="0.01" value={form.fuel_rate} onChange={e => setForm(f => ({ ...f, fuel_rate: e.target.value }))} /></div>
                                <div className="space-y-1"><Label>Fuel Amount</Label><Input disabled value={fuelAmount} /></div>
                            </CardContent>
                        </Card>
                        <Card className="border border-slate-100 shadow-none"><CardHeader className="pb-2 bg-accent/10 border-b border-accent/20 rounded-t-lg"><CardTitle className="text-lg text-accent">Driver & Trip Financial Summary</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1"><Label className="required">Driver Name</Label><Select value={form.driver_name} onValueChange={v => setForm(f => ({ ...f, driver_name: v }))} disabled={isCommissioned}><SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger><SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.driver_name}>{d.driver_name}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-1"><Label className="required">Driver Loading Advance</Label><Input type="number" step="0.01" value={form.driver_loading_advance} onChange={e => setForm(f => ({ ...f, driver_loading_advance: e.target.value }))} /></div>
                                <div className="space-y-1"><Label>Trip Balance</Label><Input disabled value={tripBalance} /></div>
                            </CardContent>
                        </Card>
                        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => { setForm(emptyForm); fetchNextVoucher(); }} disabled={submitting}>Clear</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button></div>
                    </form>
                    {lastSaved && <div className="text-xs text-slate-500">Last saved: {lastSaved.voucher_number} on {new Date(lastSaved.voucher_datetime).toLocaleString()}</div>}
                </DialogContent>
            </Dialog>
            <LoadingAdvanceTable refreshKey={refreshKey} />
        </div>
    );
};
export default LoadingAdvance;
