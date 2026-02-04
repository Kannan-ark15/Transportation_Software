import React, { useState, useEffect } from 'react';
import DataToolbar from './common/DataToolbar';
import { companyAPI } from '../services/api';
import ViewCompanyModal from './ViewCompanyModal';
import Pagination from './Pagination';
import {
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    Building2,
    MapPin,
    Phone,
    Mail,
    SearchX,
    Loader2,
    Globe,
    FileText,
    Hash
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

const CompanyList = () => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        company_name: '',
        place: '',
        company_address_1: '',
        company_address_2: '',
        gst_no: '',
        pin_code: '',
        contact_no: '',
        email_id: ''
    });

    const [formErrors, setFormErrors] = useState({});

    useEffect(() => { loadCompanies(); }, []);

    const loadCompanies = async () => {
        try {
            setLoading(true);
            const res = await companyAPI.getAll();
            if (res.success) setCompanies(res.data);
        } catch (err) { setError('Failed to load companies'); }
        finally { setLoading(false); }
    };

    const handleImport = async (importedData) => {
        try {
            setLoading(true);
            let successCount = 0;
            let errors = [];

            for (const row of importedData) {
                const mappedData = {
                    company_name: row['Company Name'] || row['company_name'],
                    place: row['Place'] || row['place'],
                    company_address_1: row['Address 1'] || row['company_address_1'],
                    company_address_2: row['Address 2'] || row['company_address_2'] || '',
                    gst_no: row['GST No'] || row['gst_no'],
                    pin_code: row['PIN Code'] || row['pin_code'],
                    contact_no: row['Contact No'] || row['contact_no'],
                    email_id: row['Email ID'] || row['email_id']
                };

                if (!mappedData.company_name) continue;

                try {
                    await companyAPI.create(mappedData);
                    successCount++;
                } catch (err) {
                    errors.push(mappedData.company_name);
                }
            }

            setSuccessMsg(`Imported ${successCount} companies successfully.`);
            if (errors.length > 0) alert(`Failed to import: ${errors.join(', ')}`);
            loadCompanies();
        } catch (err) {
            setError('Import failed');
        } finally {
            setLoading(false);
        }
    };

    const exportColumns = [
        { header: 'Company Name', dataKey: 'company_name' },
        { header: 'Place', dataKey: 'place' },
        { header: 'GST No', dataKey: 'gst_no' },
        { header: 'Contact', dataKey: 'contact_no' },
        { header: 'Email', dataKey: 'email_id' },
    ];

    const handleOpenModal = (mode, company = null) => {
        setModalMode(mode);
        setSelectedCompany(company);
        setFormErrors({});
        if (company) {
            setFormData({
                company_name: company.company_name,
                place: company.place,
                company_address_1: company.company_address_1,
                company_address_2: company.company_address_2 || '',
                gst_no: company.gst_no,
                pin_code: company.pin_code,
                contact_no: company.contact_no,
                email_id: company.email_id
            });
        } else {
            setFormData({
                company_name: '',
                place: '',
                company_address_1: '',
                company_address_2: '',
                gst_no: '',
                pin_code: '',
                contact_no: '',
                email_id: ''
            });
        }
        setModalOpen(true);
    };

    const validate = () => {
        const errors = {};
        if (!formData.company_name.trim()) errors.company_name = 'Required';
        if (!formData.place.trim()) errors.place = 'Required';
        if (!formData.company_address_1.trim()) errors.company_address_1 = 'Required';
        if (!formData.gst_no.trim()) errors.gst_no = 'Required';
        else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_no)) {
            errors.gst_no = 'Invalid Format';
        }
        if (!formData.pin_code.trim()) errors.pin_code = 'Required';
        if (!formData.contact_no.trim()) errors.contact_no = 'Required';
        if (!formData.email_id.trim()) errors.email_id = 'Required';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setSubmitting(true);
            let res;
            if (modalMode === 'add') res = await companyAPI.create(formData);
            else res = await companyAPI.update(selectedCompany.id, formData);

            if (res.success) {
                setSuccessMsg(`Company ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
                setModalOpen(false);
                loadCompanies();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete company "${name}"?`)) return;
        try {
            const res = await companyAPI.delete(id);
            if (res.success) {
                setSuccessMsg('Company deleted successfully');
                loadCompanies();
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) { setError('Failed to delete company'); }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = companies.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-lg font-medium">Loading companies...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-blue-600" />
                            Company Master
                        </CardTitle>
                        <p className="text-sm text-slate-500">Manage transport companies and corporate profiles</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <DataToolbar
                            onImport={handleImport}
                            data={companies}
                            columns={exportColumns}
                            title="Company Master Report"
                            fileName="companies_list"
                        />
                        <Button
                            onClick={() => handleOpenModal('add')}
                            className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Company
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

                    {companies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                <SearchX className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Companies Found</h3>
                            <p className="text-slate-500 mb-6">Register your companies to start managing operations.</p>
                            <Button variant="outline" onClick={() => handleOpenModal('add')}>
                                Add New Company
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[80px] font-bold text-slate-700">S.No</TableHead>
                                            <TableHead className="font-bold text-slate-700">Company Name</TableHead>
                                            <TableHead className="font-bold text-slate-700">Place</TableHead>
                                            <TableHead className="font-bold text-slate-700">GST No</TableHead>
                                            <TableHead className="font-bold text-slate-700">Contact</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((c, i) => (
                                            <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-500 text-xs">
                                                    {startIndex + i + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-slate-900">{c.company_name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                        {c.place}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="font-mono bg-slate-100 text-slate-700 border-none">
                                                        {c.gst_no}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5 text-slate-900 text-sm font-medium">
                                                            <Phone className="w-3 h-3 text-slate-400" />
                                                            {c.contact_no}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
                                                            <Mail className="w-3 h-3 text-slate-400" />
                                                            {c.email_id}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setSelectedCompany(c);
                                                                setViewModalOpen(true);
                                                            }}
                                                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleOpenModal('edit', c)}
                                                            className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(c.id, c.company_name)}
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
                                    totalItems={companies.length}
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
                            {modalMode === 'add' ? <Plus className="w-5 h-5 text-blue-600" /> : <Edit className="w-5 h-5 text-amber-600" />}
                            {modalMode === 'add' ? 'Register New Company' : 'Edit Company Profile'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="company_name" className="required flex items-center gap-2">
                                    <Building2 className="w-3 h-3 text-slate-400" /> Company Name
                                </Label>
                                <Input
                                    id="company_name"
                                    value={formData.company_name}
                                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                    placeholder="Enter company name"
                                    className={cn(formErrors.company_name && "border-red-500")}
                                    required
                                />
                                {formErrors.company_name && <p className="text-xs text-red-500">{formErrors.company_name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="place" className="required flex items-center gap-2">
                                    <MapPin className="w-3 h-3 text-slate-400" /> City / Place
                                </Label>
                                <Input
                                    id="place"
                                    value={formData.place}
                                    onChange={e => setFormData({ ...formData, place: e.target.value })}
                                    placeholder="e.g. Mumbai"
                                    className={cn(formErrors.place && "border-red-500")}
                                    required
                                />
                                {formErrors.place && <p className="text-xs text-red-500">{formErrors.place}</p>}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="address1" className="required flex items-center gap-2">
                                    <FileText className="w-3 h-3 text-slate-400" /> Address Line 1
                                </Label>
                                <Textarea
                                    id="address1"
                                    value={formData.company_address_1}
                                    onChange={e => setFormData({ ...formData, company_address_1: e.target.value })}
                                    className={cn("min-h-[80px]", formErrors.company_address_1 && "border-red-500")}
                                    required
                                />
                                {formErrors.company_address_1 && <p className="text-xs text-red-500">{formErrors.company_address_1}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address2" className="flex items-center gap-2 text-slate-500">
                                    <FileText className="w-3 h-3 text-slate-300" /> Address Line 2 (Optional)
                                </Label>
                                <Textarea
                                    id="address2"
                                    value={formData.company_address_2}
                                    onChange={e => setFormData({ ...formData, company_address_2: e.target.value })}
                                    className="min-h-[80px]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="gst" className="required flex items-center gap-2">
                                    <Hash className="w-3 h-3 text-slate-400" /> GST Number
                                </Label>
                                <Input
                                    id="gst"
                                    value={formData.gst_no}
                                    onChange={e => setFormData({ ...formData, gst_no: e.target.value })}
                                    className={cn("font-mono uppercase", formErrors.gst_no && "border-red-500")}
                                    placeholder="22AAAAA0000A1Z5"
                                    maxLength={15}
                                    required
                                />
                                {formErrors.gst_no && <p className="text-xs text-red-500">{formErrors.gst_no}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pin" className="required flex items-center gap-2">
                                    <Globe className="w-3 h-3 text-slate-400" /> PIN Code
                                </Label>
                                <Input
                                    id="pin"
                                    value={formData.pin_code}
                                    onChange={e => setFormData({ ...formData, pin_code: e.target.value })}
                                    maxLength={6}
                                    className={cn(formErrors.pin_code && "border-red-500")}
                                    required
                                />
                                {formErrors.pin_code && <p className="text-xs text-red-500">{formErrors.pin_code}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact" className="required flex items-center gap-2">
                                    <Phone className="w-3 h-3 text-slate-400" /> Contact Number
                                </Label>
                                <Input
                                    id="contact"
                                    value={formData.contact_no}
                                    onChange={e => setFormData({ ...formData, contact_no: e.target.value })}
                                    maxLength={10}
                                    className={cn(formErrors.contact_no && "border-red-500")}
                                    required
                                />
                                {formErrors.contact_no && <p className="text-xs text-red-500">{formErrors.contact_no}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="required flex items-center gap-2">
                                    <Mail className="w-3 h-3 text-slate-400" /> Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email_id}
                                    onChange={e => setFormData({ ...formData, email_id: e.target.value })}
                                    className={cn(formErrors.email_id && "border-red-500")}
                                    required
                                />
                                {formErrors.email_id && <p className="text-xs text-red-500">{formErrors.email_id}</p>}
                            </div>
                        </div>

                        <DialogFooter className="pt-6 border-t border-slate-100">
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
                                {modalMode === 'add' ? 'Register Company' : 'Update Profile'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ViewCompanyModal
                isOpen={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                company={selectedCompany}
            />
        </div >
    );
};

export default CompanyList;
