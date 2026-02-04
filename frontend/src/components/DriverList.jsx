import React, { useState, useEffect } from 'react';
import DataToolbar from './common/DataToolbar';
import { driverAPI } from '../services/api';
import Pagination from './Pagination';
import {
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    User,
    UserX,
    Loader2,
    Phone,
    CreditCard,
    MapPin,
    Calendar,
    Contact,
    Building,
    FileText,
    Activity,
    SearchX
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
import { Switch } from '@/components/ui/switch';
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
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

const DriverList = () => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        driver_name: '', primary_contact_no: '', secondary_contact_no: '', blood_group: 'O+',
        address: '', license_no: '', license_exp_date: '', aadhar_no: '',
        bank_name: '', branch: '', account_number: '', ifsc_code: '', driver_status: true
    });

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'A1+', 'A1-', 'A2+', 'A2-', 'A1B+', 'A1B-', 'A2B+', 'A2B-'];

    useEffect(() => { loadDrivers(); }, []);

    const loadDrivers = async () => {
        try {
            setLoading(true);
            const res = await driverAPI.getAll();
            if (res.success) setDrivers(res.data);
        } catch (err) { setError('Failed to load drivers'); }
        finally { setLoading(false); }
    };

    const handleImport = async (importedData) => {
        try {
            setLoading(true);
            let successCount = 0;
            let errors = [];

            // Helper to parse dates
            const parseDate = (val) => {
                if (!val) return null;
                if (val instanceof Date) return val.toISOString().split('T')[0];
                if (typeof val === 'number') {
                    // Excel number to date
                    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                    return date.toISOString().split('T')[0];
                }
                const date = new Date(val);
                if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
                return null;
            };

            for (const row of importedData) {
                const mappedData = {
                    driver_name: row['Driver Name'] || row['driver_name'],
                    primary_contact_no: row['Primary Contact'] || row['primary_contact_no'],
                    secondary_contact_no: row['Secondary Contact'] || row['secondary_contact_no'] || '',
                    blood_group: row['Blood Group'] || row['blood_group'] || 'O+',
                    address: row['Address'] || row['address'],
                    license_no: row['License No'] || row['license_no'],
                    license_exp_date: parseDate(row['License Expiry']) || parseDate(row['license_exp_date']),
                    aadhar_no: row['Aadhar No'] || row['aadhar_no'],
                    bank_name: row['Bank Name'] || row['bank_name'],
                    branch: row['Branch'] || row['branch'],
                    account_number: row['Account No'] || row['account_number'],
                    ifsc_code: row['IFSC'] || row['ifsc_code'],
                    driver_status: true
                };

                if (!mappedData.driver_name || !mappedData.primary_contact_no || !mappedData.license_no) continue;

                try {
                    await driverAPI.create(mappedData);
                    successCount++;
                } catch (err) {
                    errors.push(mappedData.driver_name);
                }
            }

            setSuccessMsg(`Imported ${successCount} drivers successfully.`);
            if (errors.length > 0) alert(`Failed to import: ${errors.join(', ')}`);
            loadDrivers();
        } catch (err) {
            setError('Import failed');
        } finally {
            setLoading(false);
        }
    };

    const exportColumns = [
        { header: 'Driver ID', dataKey: 'driver_id' },
        { header: 'Name', dataKey: 'driver_name' },
        { header: 'Contact', dataKey: 'primary_contact_no' },
        { header: 'License No', dataKey: 'license_no' },
        { header: 'Status', dataKey: 'driver_status' },
    ];

    const handleOpenModal = (mode, driver = null) => {
        setModalMode(mode);
        setSelectedDriver(driver);
        if (driver) {
            setFormData({
                driver_name: driver.driver_name,
                primary_contact_no: driver.primary_contact_no,
                secondary_contact_no: driver.secondary_contact_no || '',
                blood_group: driver.blood_group,
                address: driver.address,
                license_no: driver.license_no,
                license_exp_date: driver.license_exp_date ? driver.license_exp_date.split('T')[0] : '',
                aadhar_no: driver.aadhar_no,
                bank_name: driver.bank_name,
                branch: driver.branch,
                account_number: driver.account_number,
                ifsc_code: driver.ifsc_code,
                driver_status: driver.driver_status
            });
        } else {
            setFormData({
                driver_name: '', primary_contact_no: '', secondary_contact_no: '', blood_group: 'O+',
                address: '', license_no: '', license_exp_date: '', aadhar_no: '',
                bank_name: '', branch: '', account_number: '', ifsc_code: '', driver_status: true
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            let res;
            if (modalMode === 'add') res = await driverAPI.create(formData);
            else res = await driverAPI.update(selectedDriver.id, formData);

            if (res.success) {
                setSuccessMsg(`Driver ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
                setModalOpen(false);
                loadDrivers();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete driver "${name}"?`)) return;
        try {
            const res = await driverAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Driver deleted successfully');
                loadDrivers();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError('Failed to delete driver'); }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = drivers.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-lg font-medium">Loading drivers...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Contact className="w-6 h-6 text-indigo-600" />
                            Driver Master
                        </CardTitle>
                        <p className="text-sm text-slate-500">Manage fleet operators and their documentation</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <DataToolbar
                            onImport={handleImport}
                            data={drivers}
                            columns={exportColumns}
                            title="Driver Master Report"
                            fileName="drivers_list"
                        />
                        <Button
                            onClick={() => handleOpenModal('add')}
                            className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Driver
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

                    {drivers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <SearchX className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Drivers Found</h3>
                            <p className="text-slate-500 mb-6">Staff your fleet by adding your first driver.</p>
                            <Button variant="outline" onClick={() => handleOpenModal('add')}>
                                Add New Driver
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[80px] font-bold text-slate-700">S.No</TableHead>
                                            <TableHead className="w-[120px] font-bold text-slate-700">Driver ID</TableHead>
                                            <TableHead className="font-bold text-slate-700">Name</TableHead>
                                            <TableHead className="font-bold text-slate-700">Contact</TableHead>
                                            <TableHead className="font-bold text-slate-700">License No</TableHead>
                                            <TableHead className="font-bold text-slate-700">Status</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((d, i) => (
                                            <TableRow key={d.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-500 text-xs">
                                                    {startIndex + i + 1}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-semibold text-slate-500">
                                                    {d.driver_id}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-slate-900">{d.driver_name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-slate-600">
                                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                        {d.primary_contact_no}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono text-xs border-slate-200 text-slate-600">
                                                        {d.license_no}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn(
                                                        "font-medium",
                                                        d.driver_status ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                    )}>
                                                        {d.driver_status ? 'Active' : 'Inactive'}
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
                                                            onClick={() => handleDelete(d.id, d.driver_name)}
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
                                    totalItems={drivers.length}
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
                            {modalMode === 'add' ? <Plus className="w-5 h-5 text-indigo-600" /> : modalMode === 'edit' ? <Edit className="w-5 h-5 text-amber-600" /> : <Eye className="w-5 h-5 text-blue-600" />}
                            {modalMode === 'add' ? 'Add New Driver' : modalMode === 'edit' ? 'Edit Driver' : 'Driver Details'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="driver_name" className="required">Driver Name</Label>
                                <Input
                                    id="driver_name"
                                    value={formData.driver_name}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, driver_name: e.target.value })}
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="blood_group">Blood Group</Label>
                                <Select
                                    value={formData.blood_group}
                                    onValueChange={val => setFormData({ ...formData, blood_group: val })}
                                    disabled={modalMode === 'view'}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bloodGroups.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="primary_contact" className="required flex items-center gap-2">
                                    <Phone className="w-3 h-3" /> Primary Contact
                                </Label>
                                <Input
                                    id="primary_contact"
                                    value={formData.primary_contact_no}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, primary_contact_no: e.target.value })}
                                    placeholder="9876543210"
                                    maxLength={10}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="secondary_contact" className="flex items-center gap-2 text-slate-500">
                                    <Phone className="w-3 h-3" /> Secondary Contact
                                </Label>
                                <Input
                                    id="secondary_contact"
                                    value={formData.secondary_contact_no}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, secondary_contact_no: e.target.value })}
                                    placeholder="Optional"
                                    maxLength={10}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address" className="required">Residential Address</Label>
                            <Textarea
                                id="address"
                                value={formData.address}
                                disabled={modalMode === 'view'}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Enter complete address"
                                className="min-h-[80px]"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="license_no" className="required">License Number</Label>
                                <Input
                                    id="license_no"
                                    value={formData.license_no}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, license_no: e.target.value })}
                                    placeholder="DL-XXXXXXXXXXXX"
                                    className="font-mono uppercase"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="license_exp" className="required">License Expiry Date</Label>
                                <Input
                                    id="license_exp"
                                    type="date"
                                    value={formData.license_exp_date}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, license_exp_date: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="aadhar_no" className="required">Aadhar Number</Label>
                                <Input
                                    id="aadhar_no"
                                    value={formData.aadhar_no}
                                    disabled={modalMode === 'view'}
                                    onChange={e => setFormData({ ...formData, aadhar_no: e.target.value })}
                                    placeholder="12 digit numbers"
                                    maxLength={12}
                                    required
                                />
                            </div>
                            <div className="flex flex-col justify-center space-y-2 pt-2">
                                <Label className="text-sm font-medium">Driver Status</Label>
                                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                                    <Switch
                                        checked={formData.driver_status}
                                        onCheckedChange={checked => setFormData({ ...formData, driver_status: checked })}
                                        disabled={modalMode === 'view'}
                                    />
                                    <span className={cn(
                                        "text-sm font-bold",
                                        formData.driver_status ? "text-green-600" : "text-slate-500"
                                    )}>
                                        {formData.driver_status ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Bank Details</span>
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
                                    <Label htmlFor="ifsc" className="required">IFSC Code</Label>
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
                                            modalMode === 'edit' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-100" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                                        )}
                                    >
                                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {modalMode === 'add' ? 'Save Driver' : 'Update changes'}
                                    </Button>
                                </>
                            ) : (
                                <Button type="button" onClick={() => setModalOpen(false)}>
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

export default DriverList;
