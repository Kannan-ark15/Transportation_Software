import React, { useState, useEffect } from 'react';
import DataToolbar from './common/DataToolbar';
import { ownerAPI } from '../services/api';
import Pagination from './Pagination';
import {
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    UserCircle,
    MapPin,
    Phone,
    Mail,
    SearchX,
    Loader2,
    Building2,
    CreditCard,
    ShieldCheck,
    Hash,
    CheckCircle2,
    AlertCircle
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from '@/lib/utils';

const OwnerList = () => {
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedOwner, setSelectedOwner] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        owner_type: 'Own', owner_name: '', pan_no: '', aadhar_no: '', gst_no: '',
        company_address: '', place: '', contact_no: '', email_id: '',
        bank_name: '', branch: '', account_no: '', ifsc_code: '', status: 'Active'
    });

    const [formErrors, setFormErrors] = useState({});

    useEffect(() => { loadOwners(); }, []);

    const loadOwners = async () => {
        try {
            setLoading(true);
            const res = await ownerAPI.getAll();
            if (res.success) setOwners(res.data);
        } catch (err) { setError('Failed to load owners'); }
        finally { setLoading(false); }
    };

    const handleImport = async (importedData) => {
        try {
            setLoading(true);
            let successCount = 0;
            let errors = [];

            for (const row of importedData) {
                const mappedData = {
                    owner_type: row['Owner Type'] || row['owner_type'] || 'Own',
                    owner_name: row['Owner Name'] || row['owner_name'],
                    pan_no: row['PAN'] || row['pan_no'],
                    aadhar_no: row['Aadhar'] || row['aadhar_no'],
                    gst_no: row['GST'] || row['gst_no'] || '',
                    company_address: row['Address'] || row['company_address'],
                    place: row['Place'] || row['place'],
                    contact_no: row['Contact No'] || row['contact_no'],
                    email_id: row['Email'] || row['email_id'] || '',
                    bank_name: row['Bank Name'] || row['bank_name'],
                    branch: row['Branch'] || row['branch'],
                    account_no: row['Account No'] || row['account_no'],
                    ifsc_code: row['IFSC'] || row['ifsc_code'],
                    status: 'Active'
                };

                if (!mappedData.owner_name || !mappedData.pan_no) continue;

                try {
                    await ownerAPI.create(mappedData);
                    successCount++;
                } catch (err) {
                    errors.push(mappedData.owner_name);
                }
            }

            setSuccessMsg(`Imported ${successCount} owners successfully.`);
            if (errors.length > 0) alert(`Failed to import: ${errors.join(', ')}`);
            loadOwners();
        } catch (err) {
            setError('Import failed');
        } finally {
            setLoading(false);
        }
    };

    const exportColumns = [
        { header: 'Owner Name', dataKey: 'owner_name' },
        { header: 'Type', dataKey: 'owner_type' },
        { header: 'Place', dataKey: 'place' },
        { header: 'Contact', dataKey: 'contact_no' },
        { header: 'PAN', dataKey: 'pan_no' },
        { header: 'Status', dataKey: 'status' },
    ];

    const handleOpenModal = (mode, owner = null) => {
        setModalMode(mode);
        setSelectedOwner(owner);
        setFormErrors({});
        if (owner) {
            setFormData({ ...owner });
        } else {
            setFormData({
                owner_type: 'Own', owner_name: '', pan_no: '', aadhar_no: '', gst_no: '',
                company_address: '', place: '', contact_no: '', email_id: '',
                bank_name: '', branch: '', account_no: '', ifsc_code: '', status: 'Active'
            });
        }
        setModalOpen(true);
    };

    const validate = () => {
        const errors = {};
        const mandatoryFields = [
            'owner_type', 'owner_name', 'pan_no', 'aadhar_no',
            'company_address', 'place', 'contact_no',
            'bank_name', 'branch', 'account_no', 'ifsc_code'
        ];

        mandatoryFields.forEach(field => {
            if (!formData[field] || String(formData[field]).trim() === '') {
                errors[field] = 'Required';
            }
        });

        if (formData.pan_no && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_no.toUpperCase())) {
            errors.pan_no = 'Invalid PAN format';
        }
        if (formData.aadhar_no && !/^\d{12}$/.test(formData.aadhar_no)) {
            errors.aadhar_no = 'Must be 12 digits';
        }
        if (formData.gst_no && formData.gst_no.trim() !== '' && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_no.toUpperCase())) {
            errors.gst_no = 'Invalid GST format';
        }
        if (formData.contact_no && !/^[6-9]\d{9}$/.test(formData.contact_no)) {
            errors.contact_no = 'Invalid contact number';
        }
        if (formData.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.toUpperCase())) {
            errors.ifsc_code = 'Invalid IFSC format';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setSubmitting(true);
            let res;
            if (modalMode === 'add') res = await ownerAPI.create(formData);
            else res = await ownerAPI.update(selectedOwner.id, formData);

            if (res.success) {
                setSuccessMsg(`Owner ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
                setModalOpen(false);
                loadOwners();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete owner "${name}"?`)) return;
        try {
            const res = await ownerAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Owner deleted successfully');
                loadOwners();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError('Failed to delete owner'); }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = owners.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-lg font-medium">Loading owners list...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <UserCircle className="w-6 h-6 text-blue-600" />
                            Owner Master
                        </CardTitle>
                        <p className="text-sm text-slate-500">Manage fleet owners, partners, and payment details</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <DataToolbar
                            onImport={handleImport}
                            data={owners}
                            columns={exportColumns}
                            title="Owner Master Report"
                            fileName="owners_list"
                        />
                        <Button
                            onClick={() => handleOpenModal('add')}
                            className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Owner
                        </Button>
                    </div>
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

                    {owners.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <SearchX className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Owners Found</h3>
                            <p className="text-slate-500 mb-6">Start by adding your fleet owners and partners.</p>
                            <Button variant="outline" onClick={() => handleOpenModal('add')}>
                                Add New Owner
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[80px] font-bold text-slate-700">S.No</TableHead>
                                            <TableHead className="font-bold text-slate-700">Owner Name</TableHead>
                                            <TableHead className="font-bold text-slate-700">Type</TableHead>
                                            <TableHead className="font-bold text-slate-700">Contact</TableHead>
                                            <TableHead className="font-bold text-slate-700">PAN / Aadhar</TableHead>
                                            <TableHead className="font-bold text-slate-700">Status</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((o, i) => (
                                            <TableRow key={o.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-500 text-xs">
                                                    {startIndex + i + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-bold text-slate-900">{o.owner_name}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" /> {o.place}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn(
                                                        "font-medium",
                                                        o.owner_type === 'Own' ? "border-blue-200 text-blue-700 bg-blue-50" :
                                                            o.owner_type === 'Dedicated' ? "border-purple-200 text-purple-700 bg-purple-50" :
                                                                "border-orange-200 text-orange-700 bg-orange-50"
                                                    )}>
                                                        {o.owner_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium text-slate-900">{o.contact_no}</div>
                                                    <div className="text-xs text-slate-500 font-mono italic">{o.email_id || 'no email'}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded inline-block">PAN: {o.pan_no}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono">ADR: {o.aadhar_no}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn(
                                                        "border-none",
                                                        o.status === 'Active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                    )}>
                                                        {o.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal('edit', o)} className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(o.id, o.owner_name)} className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50">
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
                                    totalItems={owners.length}
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
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {modalMode === 'add' ? <Plus className="w-5 h-5 text-blue-600" /> : <Edit className="w-5 h-5 text-amber-600" />}
                            {modalMode === 'add' ? 'Add New Owner' : 'Edit Owner Profile'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-8 py-4 px-1">
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <UserCircle className="w-4 h-4" /> Owner Information
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="required">Owner Type</Label>
                                    <Select value={formData.owner_type} onValueChange={val => setFormData({ ...formData, owner_type: val })}>
                                        <SelectTrigger className={cn(formErrors.owner_type && "border-red-500")}>
                                            <SelectValue placeholder="Select Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Own">Own</SelectItem>
                                            <SelectItem value="Dedicated">Dedicated</SelectItem>
                                            <SelectItem value="Market">Market</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {formErrors.owner_type && <p className="text-[10px] text-red-500">{formErrors.owner_type}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="owner_name" className="required">Owner Name</Label>
                                    <Input
                                        id="owner_name"
                                        value={formData.owner_name}
                                        onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                                        placeholder="Enter full name"
                                        className={cn(formErrors.owner_name && "border-red-500")}
                                    />
                                    {formErrors.owner_name && <p className="text-[10px] text-red-500">{formErrors.owner_name}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="pan_no" className="required">PAN Number</Label>
                                    <Input
                                        id="pan_no"
                                        value={formData.pan_no}
                                        onChange={e => setFormData({ ...formData, pan_no: e.target.value.toUpperCase() })}
                                        placeholder="ABCDE1234F"
                                        maxLength={10}
                                        className={cn("font-mono", formErrors.pan_no && "border-red-500")}
                                    />
                                    {formErrors.pan_no && <p className="text-[10px] text-red-500">{formErrors.pan_no}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="aadhar_no" className="required">Aadhar Number</Label>
                                    <Input
                                        id="aadhar_no"
                                        value={formData.aadhar_no}
                                        onChange={e => setFormData({ ...formData, aadhar_no: e.target.value })}
                                        placeholder="12 digit number"
                                        maxLength={12}
                                        className={cn("font-mono", formErrors.aadhar_no && "border-red-500")}
                                    />
                                    {formErrors.aadhar_no && <p className="text-[10px] text-red-500">{formErrors.aadhar_no}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gst_no">GST Number (Optional)</Label>
                                    <Input
                                        id="gst_no"
                                        value={formData.gst_no}
                                        onChange={e => setFormData({ ...formData, gst_no: e.target.value.toUpperCase() })}
                                        placeholder="15 digit GST"
                                        maxLength={15}
                                        className={cn("font-mono", formErrors.gst_no && "border-red-500")}
                                    />
                                    {formErrors.gst_no && <p className="text-[10px] text-red-500">{formErrors.gst_no}</p>}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Contact & Address
                            </h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="company_address" className="required">Company Address</Label>
                                    <Textarea
                                        id="company_address"
                                        value={formData.company_address}
                                        onChange={e => setFormData({ ...formData, company_address: e.target.value })}
                                        className={cn("min-h-[80px]", formErrors.company_address && "border-red-500")}
                                    />
                                    {formErrors.company_address && <p className="text-[10px] text-red-500">{formErrors.company_address}</p>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="place" className="required">Place / City</Label>
                                        <Input id="place" value={formData.place} onChange={e => setFormData({ ...formData, place: e.target.value })} />
                                        {formErrors.place && <p className="text-[10px] text-red-500">{formErrors.place}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contact_no" className="required">Contact Number</Label>
                                        <Input id="contact_no" value={formData.contact_no} onChange={e => setFormData({ ...formData, contact_no: e.target.value })} maxLength={10} />
                                        {formErrors.contact_no && <p className="text-[10px] text-red-500">{formErrors.contact_no}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email_id">Email Address</Label>
                                        <Input id="email_id" type="email" value={formData.email_id} onChange={e => setFormData({ ...formData, email_id: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <CreditCard className="w-4 h-4" /> Bank Account Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bank_name" className="required">Bank Name</Label>
                                    <Input id="bank_name" value={formData.bank_name} onChange={e => setFormData({ ...formData, bank_name: e.target.value })} />
                                    {formErrors.bank_name && <p className="text-[10px] text-red-500">{formErrors.bank_name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="branch" className="required">Branch</Label>
                                    <Input id="branch" value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })} />
                                    {formErrors.branch && <p className="text-[10px] text-red-500">{formErrors.branch}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="account_no" className="required">Account Number</Label>
                                    <Input id="account_no" value={formData.account_no} onChange={e => setFormData({ ...formData, account_no: e.target.value })} className="font-mono" />
                                    {formErrors.account_no && <p className="text-[10px] text-red-500">{formErrors.account_no}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ifsc_code" className="required">IFSC Code</Label>
                                    <Input id="ifsc_code" value={formData.ifsc_code} onChange={e => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })} className="font-mono" maxLength={11} />
                                    {formErrors.ifsc_code && <p className="text-[10px] text-red-500">{formErrors.ifsc_code}</p>}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between pb-4">
                            <div className="space-y-1">
                                <Label className="text-base font-bold text-slate-900">Owner Status</Label>
                                <p className="text-sm text-slate-500">Enable or disable this owner for new operations.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={cn("text-sm font-bold", formData.status === 'Active' ? "text-green-600" : "text-red-600")}>
                                    {formData.status === 'Active' ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                                <Switch
                                    checked={formData.status === 'Active'}
                                    onCheckedChange={checked => setFormData({ ...formData, status: checked ? 'Active' : 'Inactive' })}
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-8 border-t border-slate-100 flex items-center justify-between">
                            <div className="text-[10px] text-slate-400 font-medium">
                                * Information will be verified as per provided documents.
                            </div>
                            <div className="flex gap-3">
                                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className={cn(
                                        "min-w-[150px] shadow-lg",
                                        modalMode === 'edit' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                                    )}
                                >
                                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {modalMode === 'add' ? 'Create Owner' : 'Save Changes'}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default OwnerList;
