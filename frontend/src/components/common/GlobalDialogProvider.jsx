import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { registerDialog } from '@/lib/dialogService';

const GlobalDialogProvider = ({ children }) => {
    const [dialog, setDialog] = useState(null);

    const openDialog = useCallback((payload) => {
        setDialog(payload);
    }, []);

    useEffect(() => {
        registerDialog(openDialog);
        return () => registerDialog(null);
    }, [openDialog]);

    const handleClose = () => {
        if (!dialog) return;
        if (dialog.type === 'confirm') dialog.resolve(false);
        if (dialog.type === 'alert') dialog.resolve();
        setDialog(null);
    };

    const handleConfirm = () => {
        if (!dialog) return;
        dialog.resolve(true);
        setDialog(null);
    };

    return (
        <>
            {children}
            <Dialog open={!!dialog} onOpenChange={(open) => { if (!open) handleClose(); }}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>{dialog?.title || 'Notice'}</DialogTitle>
                        <DialogDescription>{dialog?.message || ''}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-4">
                        {dialog?.type === 'confirm' ? (
                            <>
                                <Button variant="outline" onClick={handleClose}>{dialog?.cancelLabel || 'Cancel'}</Button>
                                <Button variant="destructive" onClick={handleConfirm}>{dialog?.confirmLabel || 'Confirm'}</Button>
                            </>
                        ) : (
                            <Button onClick={handleClose}>OK</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default GlobalDialogProvider;
