import React, { useState, useEffect } from 'react';
import { pumpAPI } from '../services/api';
import Pagination from './Pagination';
import {
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    Fuel,
    MapPin,
    Phone,
    Mail,
    SearchX,
    Loader2,
    IndianRupee,
    User,
    Building,
    CreditCard,
    Globe,
    FileText
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

const PumpList = () => {
    const [pumps, setPumps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedPump, setSelectedPump] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        pump_name: '', rate: '', contact_person: '', contact_no: '', email_id: '',
        company_address_1: '', company_address_2: '', place: '', pan_no: '', gst_no: '',
        bank_name: '', branch: '', account_number: '', ifsc_code: ''
    });

    useEffect(() => { loadPumps(); }, []);

    const loadPumps = async () => {
        try {
            setLoading(true);
            const res = await pumpAPI.getAll();
            if (res.success) setPumps(res.data);
        } catch (err) { setError('Failed to load pump stations'); }
        finally { setLoading(false); }
    };

    const handleOpenModal = (mode, pump = null) => {
        setModalMode(mode);
        setSelectedPump(pump);
        if (pump) {
            setFormData({ ...pump, company_address_2: pump.company_address_2 || '' });
        } else {
            setFormData({
                pump_name: '', rate: '', contact_person: '', contact_no: '', email_id: '',
                company_address_1: '', company_address_2: '', place: '', pan_no: '', gst_no: '',
                bank_name: '', branch: '', account_number: '', ifsc_code: ''
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            let res;
            if (modalMode === 'add') res = await pumpAPI.create(formData);
            else res = await pumpAPI.update(selectedPump.id, formData);

            if (res.success) {
                setSuccessMsg(`Pump station ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
                setModalOpen(false);
                loadPumps();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete pump station "${name}"?`)) return;
        try {
            const res = await pumpAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Pump deleted successfully');
                loadPumps();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError('Failed to delete pump station'); }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = pumps.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-lg font-medium">Loading pump stations...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Fuel className="w-6 h-6 text-blue-600" />
                            Pump Master
                        </CardTitle>
                        <p className="text-sm text-slate-500">Manage fuel supply stations and service rates</p>
                    </div>
                    <Button
                        onClick={() => handleOpenModal('add')}
                        className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Pump
                    </Button>
                </CardHeader>

                <CardContent className="pt-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium">
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-100 text-green-600 rounded-lg text-sm font-medium">
                            {successMsg}
                        </div>
                    )}

                    {pumps.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <SearchX className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Pumps Found</h3>
                            <p className="text-slate-500 mb-6">Register your fuel partners to start tracking expenses.</p>
                            <Button variant="outline" onClick={() => handleOpenModal('add')}>
                                Add New Pump
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[80px] font-bold text-slate-700">S.No</TableHead>
                                            <TableHead className="font-bold text-slate-700">Station Name</TableHead>
                                            <TableHead className="font-bold text-slate-700">Current Rate</TableHead>
                                            <TableHead className="font-bold text-slate-700">Location</TableHead>
                                            <TableHead className="font-bold text-slate-700">Contact Person</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((p, i) => (
                                            <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-500 text-xs">
                                                    {startIndex + i + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-slate-900">{p.pump_name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-blue-50 text-blue-700 border-none font-bold">
                                                        ₹ {p.rate} / L
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                        {p.place}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-slate-900">{p.contact_person}</span>
                                                        <span className="text-xs text-slate-500">{p.contact_no}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleOpenModal('view', p)}
                                                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleOpenModal('edit', p)}
                                                            className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(p.id, p.pump_name)}
                                                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="mt-4">
                                <Pagination
                                    currentPage={currentPage}
                                    totalItems={pumps.length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setCurrentPage}
                                    onItemsPerPageChange={setItemsPerPage}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card >

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {modalMode === 'add' ? <Plus className="w-5 h-5 text-blue-600" /> : modalMode === 'edit' ? <Edit className="w-5 h-5 text-amber-600" /> : <Eye className="w-5 h-5 text-blue-600" />}
                            {modalMode === 'add' ? 'Add New Pump' : modalMode === 'edit' ? 'Edit Pump Details' : 'Pump Station Profile'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="pump_name" className="required flex items-center gap-2">
                                    <Building className="w-3 h-3 text-slate-400" /> Station Name
                                </Label>
                                <Input
                                    id="pump_name"
                                    value={formData.pump_name}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, pump_name: e.target.value })}
                                    placeholder="Enter pump name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rate" className="required flex items-center gap-2">
                                    <IndianRupee className="w-3 h-3 text-slate-400" /> Current Rate (₹)
                                </Label>
                                <Input
                                    id="rate"
                                    type="number"
                                    step="0.01"
                                    value={formData.rate}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, rate: e.target.value })}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact_person" className="required flex items-center gap-2">
                                    <User className="w-3 h-3 text-slate-400" /> Contact Person
                                </Label>
                                <Input
                                    id="contact_person"
                                    value={formData.contact_person}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                                    placeholder="Manager name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact_no" className="flex items-center gap-2">
                                    <Phone className="w-3 h-3 text-slate-400" /> Contact Number
                                </Label>
                                <Input
                                    id="contact_no"
                                    value={formData.contact_no}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, contact_no: e.target.value })}
                                    placeholder="Phone/Mobile"
                                    maxLength={10}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="required flex items-center gap-2">
                                    <Mail className="w-3 h-3 text-slate-400" /> Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email_id}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, email_id: e.target.value })}
                                    placeholder="station@example.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="place" className="required flex items-center gap-2">
                                    <MapPin className="w-3 h-3 text-slate-400" /> Location / Place
                                </Label>
                                <Input
                                    id="place"
                                    value={formData.place}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, place: e.target.value })}
                                    placeholder="City/Region"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="address1" className="required">Address Line 1</Label>
                                <Textarea
                                    id="address1"
                                    value={formData.company_address_1}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, company_address_1: e.target.value })}
                                    className="min-h-[80px]"
                                    required
                                />
                            </div>
                            <div className="space-y-2 text-slate-500">
                                <Label htmlFor="address2">Address Line 2</Label>
                                <Textarea
                                    id="address2"
                                    value={formData.company_address_2}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, company_address_2: e.target.value })}
                                    placeholder="Optional"
                                    className="min-h-[80px]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="pan" className="required flex items-center gap-2">
                                    <FileText className="w-3 h-3 text-slate-400" /> PAN Number
                                </Label>
                                <Input
                                    id="pan"
                                    value={formData.pan_no}
                                    disabled={modalMode !== 'add'}
                                    onChange={e => setFormData({ ...formData, pan_no: e.target.value })}
                                    className="font-mono uppercase"
                                    placeholder="ABCDE1234F"
                                    maxLength={10}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gst" className="required flex items-center gap-2">
                                    <Globe className="w-3 h-3 text-slate-400" /> GST Number
                                </Label>
                                <Input
                                    id="gst"
                                    value={formData.gst_no}
                                    disabled={modalMode !== 'add'}
                                    onChange={e => setFormData({ ...formData, gst_no: e.target.value })}
                                    className="font-mono uppercase"
                                    placeholder="22AAAAA0000A1Z5"
                                    maxLength={15}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Settlement Bank</span>
                                <Separator className="flex-1" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bank_name" className="required">Bank Name</Label>
                                    <Input id="bank_name" value={formData.bank_name} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, bank_name: e.target.value })} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="branch" className="required">Branch</Label>
                                    <Input id="branch" value={formData.branch} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, branch: e.target.value })} required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="account_no" className="required">Account Number</Label>
                                    <Input id="account_no" value={formData.account_number} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, account_number: e.target.value })} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ifsc" className="required font-mono">IFSC Code</Label>
                                    <Input id="ifsc" value={formData.ifsc_code} disabled={modalMode === 'view'} onChange={e => setFormData({ ...formData, ifsc_code: e.target.value })} className="font-mono uppercase" required />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-6 border-t border-slate-100">
                            {modalMode !== 'view' ? (
                                <>
                                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className={cn(
                                            "min-w-[120px]",
                                            modalMode === 'edit' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-100" : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
                                        )}
                                    >
                                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {modalMode === 'add' ? 'Register Pump' : 'Update Profile'}
                                    </Button>
                                </>
                            ) : (
                                <Button type="button" onClick={() => setModalOpen(false)} className="bg-slate-900">
                                    Close
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default PumpList;
