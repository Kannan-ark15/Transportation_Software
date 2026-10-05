import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formatMoney = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '0.00';
    return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const SettlementConfirmationDialog = ({
    open,
    onOpenChange,
    partyLabel,
    partyName,
    cashBank,
    onCashBankChange,
    bankDetails,
    selectedVouchers,
    amount,
    amountLabel,
    submitting,
    onConfirm
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Ready for Settlement</DialogTitle>
                <DialogDescription>
                    Review the selected entries and confirm the settlement details.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label>{partyLabel}</Label>
                        <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm font-medium">
                            {partyName || '-'}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>Payment Mode</Label>
                        <Select value={cashBank} onValueChange={onCashBankChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select payment mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Bank">Bank</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {cashBank === 'Bank' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border bg-slate-50 p-4">
                        <div className="space-y-1">
                            <Label>Bank Name</Label>
                            <div className="text-sm font-medium">{bankDetails?.bank_name || '-'}</div>
                        </div>
                        <div className="space-y-1">
                            <Label>Branch</Label>
                            <div className="text-sm font-medium">{bankDetails?.branch || '-'}</div>
                        </div>
                        <div className="space-y-1">
                            <Label>Account Number</Label>
                            <div className="text-sm font-medium">{bankDetails?.account_number || '-'}</div>
                        </div>
                        <div className="space-y-1">
                            <Label>IFSC Code</Label>
                            <div className="text-sm font-medium">{bankDetails?.ifsc_code || '-'}</div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-md border bg-blue-50 px-4 py-3">
                        <div className="text-xs text-slate-500">Selected Entries</div>
                        <div className="text-lg font-semibold text-slate-900">{selectedVouchers.length}</div>
                    </div>
                    <div className="rounded-md border bg-emerald-50 px-4 py-3">
                        <div className="text-xs text-slate-500">{amountLabel}</div>
                        <div className="text-lg font-semibold text-emerald-700">{formatMoney(amount)}</div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Selected Vouchers</Label>
                    <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                        {selectedVouchers.map((voucher) => (
                            <div key={voucher.acknowledgement_id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                <span className="font-medium">{voucher.voucher_number || '-'}</span>
                                <span className="text-slate-500">Vehicle: {voucher.vehicle_number || '-'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                    Cancel
                </Button>
                <Button type="button" onClick={onConfirm} disabled={submitting}>
                    {submitting ? 'Processing...' : 'Settle'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

export default SettlementConfirmationDialog;
