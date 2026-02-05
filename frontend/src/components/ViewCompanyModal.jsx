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
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">
                <Icon className="w-3.5 h-3.5" />
                {label}
            </div>
            <div className="text-foreground font-semibold pl-5 text-sm">
                {value || <span className="text-muted-foreground/60 italic">Not provided</span>}
            </div>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] border-none shadow-soft-lg">
                <DialogHeader className="pb-4 border-b border-border/60 mb-2">
                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-foreground">
                        <div className="bg-muted/60 p-2 rounded-lg">
                            <Building2 className="w-6 h-6 text-accent" />
                        </div>
                        Company Profile
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-x-8 gap-y-6 py-4">
                    <InfoItem icon={Building2} label="Company name" value={company.company_name} />
                    <InfoItem icon={MapPin} label="Base Location" value={company.place} />

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">
                            <Hash className="w-3.5 h-3.5" />
                            GST Registration
                        </div>
                        <div className="pl-5">
                            <Badge variant="outline" className="font-mono bg-muted/60 text-foreground/80 border-border/60 px-3 py-1">
                                {company.gst_no}
                            </Badge>
                        </div>
                    </div>

                    <InfoItem icon={Globe} label="PIN Code" value={company.pin_code} />

                    <Separator className="col-span-2 bg-border/60 my-1" />

                    <InfoItem icon={Phone} label="Contact phone" value={company.contact_no} />
                    <InfoItem icon={Mail} label="Official email" value={company.email_id} />

                    <Separator className="col-span-2 bg-border/60 my-1" />

                    <div className="col-span-2 space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-4 h-4 text-muted-foreground/70" />
                            <span className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">Registered Address</span>
                            <div className="flex-1 border-t border-border/60 ml-2" />
                        </div>

                        <div className="bg-muted/60 p-4 rounded-xl border border-border/60 space-y-3">
                            <div className="text-sm text-foreground/80 leading-relaxed font-medium">
                                {company.company_address_1}
                            </div>
                            {company.company_address_2 && (
                                <>
                                    <Separator className="bg-border/60" />
                                    <div className="text-sm text-muted-foreground italic">
                                        {company.company_address_2}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4 px-1 py-3 bg-muted/60 rounded-lg border border-border/60">
                    <div className="flex flex-col px-4 border-r border-border/60">
                        <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-tighter">Registration Date</span>
                        <span className="text-xs font-medium text-muted-foreground truncate">{formatDate(company.created_at)}</span>
                    </div>
                    <div className="flex flex-col px-4 flex-1">
                        <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-tighter">Last Profile Update</span>
                        <span className="text-xs font-medium text-muted-foreground truncate">{formatDate(company.updated_at)}</span>
                    </div>
                </div>

                <DialogFooter className="pt-6 sm:justify-end">
                    <Button onClick={onClose} variant="ghost" className="text-muted-foreground hover:text-foreground transition-colors">
                        Dismiss Details
                    </Button>
                    <Button onClick={onClose} className="bg-foreground text-background hover:bg-foreground/90 shadow-soft min-w-[100px]">
                        Back to List
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ViewCompanyModal;
