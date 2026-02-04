import React, { useState, useEffect } from 'react';
import DataToolbar from './common/DataToolbar';
import { bankAPI } from '../services/api';
import Pagination from './Pagination';
import {
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    Building2,
    CreditCard,
    Hash,
    SearchX,
    Loader2,
    Landmark,
    ShieldCheck,
    UserCircle,
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
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from '@/lib/utils';

const BankList = () => {
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedBank, setSelectedBank] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        bank_name: '', branch: '', ifsc_code: '', account_no: '',
        account_type: 'Current', aadhar_no: '', pan_no: '', status: 'Active'
    });

    const [formErrors, setFormErrors] = useState({});

    useEffect(() => { loadBanks(); }, []);

    const loadBanks = async () => {
        try {
            setLoading(true);
            const res = await bankAPI.getAll();
            if (res.success) setBanks(res.data);
        } catch (err) { setError('Failed to load bank accounts'); }
        finally { setLoading(false); }
    };

    const handleImport = async (importedData) => {
        try {
            setLoading(true);
            let successCount = 0;
            let errors = [];

            for (const row of importedData) {
                const mappedData = {
                    bank_name: row['Bank Name'] || row['bank_name'],
                    branch: row['Branch'] || row['branch'],
                    ifsc_code: row['IFSC'] || row['ifsc_code'],
                    account_no: row['Account No'] || row['account_no'],
                    account_type: row['Account Type'] || row['account_type'] || 'Current',
                    aadhar_no: row['Aadhar'] || row['aadhar_no'] || '',
                    pan_no: row['PAN'] || row['pan_no'] || '',
                    status: 'Active'
                };

                if (!mappedData.bank_name || !mappedData.account_no) continue;

                try {
                    await bankAPI.create(mappedData);
                    successCount++;
                } catch (err) {
                    errors.push(mappedData.account_no);
                }
            }

            setSuccessMsg(`Imported ${successCount} bank accounts successfully.`);
            if (errors.length > 0) alert(`Failed to import: ${errors.join(', ')}`);
            loadBanks();
        } catch (err) {
            setError('Import failed');
        } finally {
            setLoading(false);
        }
    };

    const exportColumns = [
        { header: 'Bank Name', dataKey: 'bank_name' },
        { header: 'Branch', dataKey: 'branch' },
        { header: 'Account No', dataKey: 'account_no' },
        { header: 'IFSC', dataKey: 'ifsc_code' },
        { header: 'Type', dataKey: 'account_type' },
        { header: 'Status', dataKey: 'status' },
    ];


    const handleOpenModal = (mode, bank = null) => {
        setModalMode(mode);
        setSelectedBank(bank);
        setFormErrors({});
        if (bank) {
            setFormData({ ...bank });
        } else {
            setFormData({
                bank_name: '', branch: '', ifsc_code: '', account_no: '',
                account_type: 'Current', aadhar_no: '', pan_no: '', status: 'Active'
            });
        }
        setModalOpen(true);
    };

    const validate = () => {
        const errors = {};
        const mandatoryFields = ['bank_name', 'branch', 'ifsc_code', 'account_no', 'account_type'];

        mandatoryFields.forEach(field => {
            if (!formData[field] || String(formData[field]).trim() === '') {
                errors[field] = 'Required';
            }
        });

        if (formData.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.toUpperCase())) {
            errors.ifsc_code = 'Invalid IFSC format';
        }
        if (formData.account_no && !/^\d+$/.test(formData.account_no)) {
            errors.account_no = 'Must be numeric';
        }
        if (formData.aadhar_no && formData.aadhar_no.trim() !== '' && !/^\d{12}$/.test(formData.aadhar_no)) {
            errors.aadhar_no = 'Must be 12 digits';
        }
        if (formData.pan_no && formData.pan_no.trim() !== '' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_no.toUpperCase())) {
            errors.pan_no = 'Invalid PAN format';
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
            if (modalMode === 'add') res = await bankAPI.create(formData);
            else res = await bankAPI.update(selectedBank.id, formData);

            if (res.success) {
                setSuccessMsg(`Bank account ${modalMode === 'add' ? 'added' : 'updated'} successfully`);
                setModalOpen(false);
                loadBanks();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete bank account for "${name}"?`)) return;
        try {
            const res = await bankAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Bank account deleted successfully');
                loadBanks();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError('Failed to delete bank account'); }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = banks.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-lg font-medium">Loading bank accounts...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Landmark className="w-6 h-6 text-blue-600" />
                            Bank Master
                        </CardTitle>
                        <p className="text-sm text-slate-500">Manage company and external bank accounts</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <DataToolbar
                            onImport={handleImport}
                            data={banks}
                            columns={exportColumns}
                            title="Bank Master Report"
                            fileName="bank_list"
                        />
                        <Button
                            onClick={() => handleOpenModal('add')}
                            className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Account
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

                    {banks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <SearchX className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Accounts Found</h3>
                            <p className="text-slate-500 mb-6">Start by adding your company bank accounts.</p>
                            <Button variant="outline" onClick={() => handleOpenModal('add')}>
                                Add New Account
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[80px] font-bold text-slate-700">S.No</TableHead>
                                            <TableHead className="font-bold text-slate-700">Bank / Branch</TableHead>
                                            <TableHead className="font-bold text-slate-700">Account Info</TableHead>
                                            <TableHead className="font-bold text-slate-700">Type</TableHead>
                                            <TableHead className="font-bold text-slate-700">Status</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((b, i) => (
                                            <TableRow key={b.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-500 text-xs">
                                                    {startIndex + i + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-bold text-slate-900">{b.bank_name}</div>
                                                    <div className="text-xs text-slate-500">{b.branch}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium text-slate-900 font-mono italic">{b.account_no}</div>
                                                    <div className="text-[10px] text-slate-500 font-mono font-bold">IFSC: {b.ifsc_code}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">
                                                        {b.account_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn(
                                                        "border-none",
                                                        b.status === 'Active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                    )}>
                                                        {b.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal('edit', b)} className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id, b.bank_name)} className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50">
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
                                    totalItems={banks.length}
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
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {modalMode === 'add' ? <Plus className="w-5 h-5 text-blue-600" /> : <Edit className="w-5 h-5 text-amber-600" />}
                            {modalMode === 'add' ? 'Add Bank Account' : 'Edit Bank Account'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-4 px-1">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Landmark className="w-3 h-3" /> Bank & Branch Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bank_name" className="required">Bank Name</Label>
                                    <Input
                                        id="bank_name"
                                        value={formData.bank_name}
                                        onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                                        placeholder="e.g. State Bank of India"
                                        className={cn(formErrors.bank_name && "border-red-500")}
                                    />
                                    {formErrors.bank_name && <p className="text-[10px] text-red-500">{formErrors.bank_name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="branch" className="required">Branch Name</Label>
                                    <Input
                                        id="branch"
                                        value={formData.branch}
                                        onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                        placeholder="e.g. Main Street Branch"
                                        className={cn(formErrors.branch && "border-red-500")}
                                    />
                                    {formErrors.branch && <p className="text-[10px] text-red-500">{formErrors.branch}</p>}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Hash className="w-3 h-3" /> Account & Statutory Info
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ifsc_code" className="required">IFSC Code</Label>
                                    <Input
                                        id="ifsc_code"
                                        value={formData.ifsc_code}
                                        onChange={e => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                                        placeholder="SBIN0001234"
                                        maxLength={11}
                                        className={cn("font-mono", formErrors.ifsc_code && "border-red-500")}
                                    />
                                    {formErrors.ifsc_code && <p className="text-[10px] text-red-500">{formErrors.ifsc_code}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="account_no" className="required">Account Number</Label>
                                    <Input
                                        id="account_no"
                                        value={formData.account_no}
                                        onChange={e => setFormData({ ...formData, account_no: e.target.value })}
                                        placeholder="Digits only"
                                        className={cn("font-mono font-bold", formErrors.account_no && "border-red-500")}
                                    />
                                    {formErrors.account_no && <p className="text-[10px] text-red-500">{formErrors.account_no}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="required">Account Type</Label>
                                    <Select value={formData.account_type} onValueChange={val => setFormData({ ...formData, account_type: val })}>
                                        <SelectTrigger className={cn(formErrors.account_type && "border-red-500")}>
                                            <SelectValue placeholder="Select Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Savings">Savings</SelectItem>
                                            <SelectItem value="Current">Current</SelectItem>
                                            <SelectItem value="OD">OD</SelectItem>
                                            <SelectItem value="CC">CC</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {formErrors.account_type && <p className="text-[10px] text-red-500">{formErrors.account_type}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="aadhar_no">Aadhar No (Owner)</Label>
                                    <Input
                                        id="aadhar_no"
                                        value={formData.aadhar_no}
                                        onChange={e => setFormData({ ...formData, aadhar_no: e.target.value })}
                                        maxLength={12}
                                        className={cn("font-mono", formErrors.aadhar_no && "border-red-500")}
                                    />
                                    {formErrors.aadhar_no && <p className="text-[10px] text-red-500">{formErrors.aadhar_no}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pan_no">PAN No (Owner)</Label>
                                    <Input
                                        id="pan_no"
                                        value={formData.pan_no}
                                        onChange={e => setFormData({ ...formData, pan_no: e.target.value.toUpperCase() })}
                                        maxLength={10}
                                        className={cn("font-mono", formErrors.pan_no && "border-red-500")}
                                    />
                                    {formErrors.pan_no && <p className="text-[10px] text-red-500">{formErrors.pan_no}</p>}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between pb-2">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold text-slate-900">Account Status</Label>
                                <p className="text-[10px] text-slate-500 italic">Toggle whether this account is active or closed.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={cn("text-xs font-bold tracking-wider", formData.status === 'Active' ? "text-green-600" : "text-red-600")}>
                                    {formData.status === 'Active' ? 'ACTIVE' : 'CLOSED'}
                                </span>
                                <Switch
                                    checked={formData.status === 'Active'}
                                    onCheckedChange={checked => setFormData({ ...formData, status: checked ? 'Active' : 'Closed' })}
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
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
                                {modalMode === 'add' ? 'Add Account' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BankList;
