import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Building2,
    MapPin,
    Hash,
    Phone,
    Mail,
    Calendar,
    Clock,
    FileText,
    Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ViewCompanyModal = ({ isOpen, onClose, company }) => {
    if (!company) return null;

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const InfoItem = ({ icon: Icon, label, value, className, isCopyable = false }) => (
        <div className={cn("space-y-1.5", className)}>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <Icon className="w-3.5 h-3.5" />
                {label}
            </div>
            <div className="text-slate-900 font-semibold pl-5 text-sm">
                {value || <span className="text-slate-300 italic">Not provided</span>}
            </div>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] border-none shadow-2xl">
                <DialogHeader className="pb-4 border-b border-slate-100 mb-2">
                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        Company Profile
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-x-8 gap-y-6 py-4">
                    <InfoItem icon={Building2} label="Company name" value={company.company_name} />
                    <InfoItem icon={MapPin} label="Base Location" value={company.place} />

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <Hash className="w-3.5 h-3.5" />
                            GST Registration
                        </div>
                        <div className="pl-5">
                            <Badge variant="outline" className="font-mono bg-blue-50/50 text-blue-700 border-blue-100 px-3 py-1">
                                {company.gst_no}
                            </Badge>
                        </div>
                    </div>

                    <InfoItem icon={Globe} label="PIN Code" value={company.pin_code} />

                    <Separator className="col-span-2 bg-slate-100/50 my-1" />

                    <InfoItem icon={Phone} label="Contact phone" value={company.contact_no} />
                    <InfoItem icon={Mail} label="Official email" value={company.email_id} />

                    <Separator className="col-span-2 bg-slate-100/50 my-1" />

                    <div className="col-span-2 space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Registered Address</span>
                            <div className="flex-1 border-t border-slate-100 ml-2" />
                        </div>

                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                            <div className="text-sm text-slate-700 leading-relaxed font-medium">
                                {company.company_address_1}
                            </div>
                            {company.company_address_2 && (
                                <>
                                    <Separator className="bg-slate-200/50" />
                                    <div className="text-sm text-slate-500 italic">
                                        {company.company_address_2}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4 px-1 py-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex flex-col px-4 border-r border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Registration Date</span>
                        <span className="text-xs font-medium text-slate-600 truncate">{formatDate(company.created_at)}</span>
                    </div>
                    <div className="flex flex-col px-4 flex-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Last Profile Update</span>
                        <span className="text-xs font-medium text-slate-600 truncate">{formatDate(company.updated_at)}</span>
                    </div>
                </div>

                <DialogFooter className="pt-6 sm:justify-end">
                    <Button onClick={onClose} variant="ghost" className="text-slate-500 hover:text-slate-900 transition-colors">
                        Dismiss Details
                    </Button>
                    <Button onClick={onClose} className="bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200 min-w-[100px]">
                        Back to List
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ViewCompanyModal;
