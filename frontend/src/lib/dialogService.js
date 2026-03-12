let openDialog = null;

export const registerDialog = (handler) => {
    openDialog = handler;
};

export const showAlert = ({ title = 'Notice', message = '' } = {}) => {
    return new Promise(resolve => {
        if (!openDialog) {
            resolve();
            return;
        }
        openDialog({
            type: 'alert',
            title,
            message,
            resolve,
        });
    });
};

export const showConfirm = ({
    title = 'Confirm',
    message = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
} = {}) => {
    return new Promise(resolve => {
        if (!openDialog) {
            resolve(false);
            return;
        }
        openDialog({
            type: 'confirm',
            title,
            message,
            confirmLabel,
            cancelLabel,
            resolve,
        });
    });
};
