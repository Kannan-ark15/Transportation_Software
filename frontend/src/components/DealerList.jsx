import React, { useState, useEffect } from 'react';
import { dealerAPI, placeAPI } from '../services/api';
import Pagination from './Pagination';
import {
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    Users,
    MapPin,
    Phone,
    SearchX,
    Loader2,
    Hash,
    Briefcase,
    ShieldCheck,
    Navigation,
    Building2
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

const DealerList = () => {
    const [dealers, setDealers] = useState([]);
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedDealer, setSelectedDealer] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        place_id: '', district: '', dealer_name: '', gst_no: '',
        contact_no_1: '', contact_no_2: '', sales_area: '', sales_officer_no: ''
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [dRes, pRes] = await Promise.all([
                dealerAPI.getAll(),
                placeAPI.getAll()
            ]);
            if (dRes.success) setDealers(dRes.data);
            if (pRes.success) setPlaces(pRes.data);
        } catch (err) { setError('Failed to load dealer data'); }
        finally { setLoading(false); }
    };

    const handleOpenModal = (mode, dealer = null) => {
        setModalMode(mode);
        setSelectedDealer(dealer);
        if (dealer) {
            setFormData({
                place_id: dealer.place_id.toString(),
                district: dealer.district,
                dealer_name: dealer.dealer_name,
                gst_no: dealer.gst_no,
                contact_no_1: dealer.contact_no_1,
                contact_no_2: dealer.contact_no_2 || '',
                sales_area: dealer.sales_area,
                sales_officer_no: dealer.sales_officer_no
            });
        } else {
            setFormData({ place_id: '', district: '', dealer_name: '', gst_no: '', contact_no_1: '', contact_no_2: '', sales_area: '', sales_officer_no: '' });
        }
        setModalOpen(true);
    };

    const handlePlaceChange = (placeId) => {
        const place = places.find(p => p.id === parseInt(placeId));
        setFormData({
            ...formData,
            place_id: placeId,
            district: place ? place.district : ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            let res;
            if (modalMode === 'add') res = await dealerAPI.create(formData);
            else res = await dealerAPI.update(selectedDealer.id, formData);

            if (res.success) {
                setSuccessMsg(`Dealer ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
                setModalOpen(false);
                loadData();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete dealer "${name}"?`)) return;
        try {
            const res = await dealerAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Dealer deleted successfully');
                loadData();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError('Failed to delete dealer'); }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = dealers.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-lg font-medium">Loading dealers...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Users className="w-6 h-6 text-emerald-600" />
                            Dealer Master
                        </CardTitle>
                        <p className="text-sm text-slate-500">Manage business partners and distribution points</p>
                    </div>
                    <Button
                        onClick={() => handleOpenModal('add')}
                        className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Dealer
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

                    {dealers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <SearchX className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Dealers Found</h3>
                            <p className="text-slate-500 mb-6">Expand your network by adding your first business dealer.</p>
                            <Button variant="outline" onClick={() => handleOpenModal('add')}>
                                Add New Dealer
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[80px] font-bold text-slate-700">S.No</TableHead>
                                            <TableHead className="font-bold text-slate-700">Dealer Name</TableHead>
                                            <TableHead className="font-bold text-slate-700">Location</TableHead>
                                            <TableHead className="font-bold text-slate-700">Contact</TableHead>
                                            <TableHead className="font-bold text-slate-700">Sales Area</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((d, i) => (
                                            <TableRow key={d.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-500 text-xs">
                                                    {startIndex + i + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-slate-900">{d.dealer_name}</div>
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                                                        <Hash className="w-2.5 h-2.5" />
                                                        {d.gst_no}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-slate-700">{d.place_name}</span>
                                                        <span className="text-xs text-slate-400">{d.district}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                        {d.contact_no_1}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none">
                                                        {d.sales_area}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleOpenModal('view', d)}
                                                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleOpenModal('edit', d)}
                                                            className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(d.id, d.dealer_name)}
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
                                    totalItems={dealers.length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setCurrentPage}
                                    onItemsPerPageChange={setItemsPerPage}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {modalMode === 'add' ? <Plus className="w-5 h-5 text-emerald-600" /> : modalMode === 'edit' ? <Edit className="w-5 h-5 text-amber-600" /> : <Eye className="w-5 h-5 text-blue-600" />}
                            {modalMode === 'add' ? 'Add New Dealer' : modalMode === 'edit' ? 'Edit Dealer' : 'Dealer Details'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-5 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <Label htmlFor="place" className="required flex items-center gap-2">
                                    <MapPin className="w-3 h-3 text-slate-400" /> Place
                                </Label>
                                <Select
                                    value={formData.place_id}
                                    onValueChange={handlePlaceChange}
                                    disabled={modalMode === 'view'}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {places.map(p => (
                                            <SelectItem key={p.id} value={p.id.toString()}>
                                                {p.to_place}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 col-span-2 sm:col-span-1 text-slate-500">
                                <Label htmlFor="district">District (Autofill)</Label>
                                <Input
                                    id="district"
                                    value={formData.district}
                                    readOnly
                                    className="bg-slate-50 border-slate-100 italic"
                                    placeholder="Select place first"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dealer_name" className="required flex items-center gap-2">
                                <Building2 className="w-3 h-3 text-slate-400" /> Dealer Name
                            </Label>
                            <Input
                                id="dealer_name"
                                value={formData.dealer_name}
                                disabled={modalMode === 'view'}
                                onChange={e => setFormData({ ...formData, dealer_name: e.target.value })}
                                placeholder="Corporate or Individual name"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="gst_no" className="required">GST Number</Label>
                                <Input
                                    id="gst_no"
                                    value={formData.gst_no}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, gst_no: e.target.value })}
                                    placeholder="22AAAAA0000A1Z5"
                                    className="font-mono uppercase"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sales_area" className="required flex items-center gap-2">
                                    <Navigation className="w-3 h-3 text-slate-400" /> Sales Area
                                </Label>
                                <Input
                                    id="sales_area"
                                    value={formData.sales_area}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, sales_area: e.target.value })}
                                    placeholder="Region name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact1" className="required flex items-center gap-2">
                                    <Phone className="w-3 h-3 text-slate-400" /> Mobile Number
                                </Label>
                                <Input
                                    id="contact1"
                                    value={formData.contact_no_1}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, contact_no_1: e.target.value })}
                                    placeholder="Primary"
                                    maxLength={10}
                                    required
                                />
                            </div>
                            <div className="space-y-2 text-slate-500">
                                <Label htmlFor="contact2">Alternate Number</Label>
                                <Input
                                    id="contact2"
                                    value={formData.contact_no_2}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, contact_no_2: e.target.value })}
                                    placeholder="Optional"
                                    maxLength={10}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="officer_no" className="required flex items-center gap-2">
                                <ShieldCheck className="w-3 h-3 text-slate-400" /> Sales Officer Contact
                            </Label>
                            <Input
                                id="officer_no"
                                value={formData.sales_officer_no}
                                disabled={modalMode === 'view'}
                                onChange={e => setFormData({ ...formData, sales_officer_no: e.target.value })}
                                placeholder="Verification officer number"
                                required
                            />
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
                                            modalMode === 'edit' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-100" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                                        )}
                                    >
                                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {modalMode === 'add' ? 'Save Dealer' : 'Update Changes'}
                                    </Button>
                                </>
                            ) : (
                                <Button type="button" onClick={() => setModalOpen(false)} className="bg-slate-900 hover:bg-slate-800">
                                    Close
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DealerList;
