import React, { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { templatesAPI } from '@/services/api';
import { exportHeadersTemplateToExcel } from '@/lib/fileUtils';

const ACRONYMS = new Set([
    'id', 'gst', 'pan', 'ifsc', 'rc', 'fc', 'km', 'pin', 'kt', 'rcl',
]);

const toFriendlyLabel = (columnName) => {
    if (!columnName) return '';

    // Split snake_case into tokens; keep numeric suffixes (address_1 -> Address 1)
    const tokens = String(columnName).split('_').filter(Boolean);

    return tokens
        .map((t) => {
            const lower = t.toLowerCase();
            if (ACRONYMS.has(lower)) return lower.toUpperCase();
            if (lower === 'no') return 'No';
            if (lower === 'at') return 'At';

            // Title-case token; preserve digits
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(' ');
};

const TemplatesPage = () => {
    const [downloading, setDownloading] = useState({}); // master -> boolean
    const [error, setError] = useState('');

    const templates = useMemo(() => ([
        { master: 'company', label: 'Company Master' },
        { master: 'products', label: 'Product Master' },
        { master: 'drivers', label: 'Driver Master' },
        { master: 'pumps', label: 'Pump Master' },
        { master: 'places', label: 'Place Master' },
        { master: 'dealers', label: 'Dealer Master' },
        { master: 'vehicles', label: 'Vehicle Master' },
        { master: 'owners', label: 'Owner Master' },
        { master: 'banks', label: 'Bank Master' },
        { master: 'rate-cards', label: 'Rate Card Master' },
    ]), []);

    const handleDownload = async (master, label) => {
        try {
            setError('');
            setDownloading((prev) => ({ ...prev, [master]: true }));

            const res = await templatesAPI.getColumns(master);
            if (!res?.success) {
                throw new Error(res?.message || 'Failed to fetch template columns');
            }

            const columns = res?.data?.columns || [];
            if (!Array.isArray(columns) || columns.length === 0) {
                throw new Error('No columns returned from server');
            }

            const headers = columns.map(toFriendlyLabel);
            const safeName = String(label).replace(/\s+/g, '_');
            exportHeadersTemplateToExcel(headers, `${safeName}_Template`);
        } catch (e) {
            console.error(e);
            setError(e?.response?.data?.message || e?.message || 'Template download failed');
        } finally {
            setDownloading((prev) => ({ ...prev, [master]: false }));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Templates</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Download Excel templates with prefilled headers for each master.
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
                    <FileSpreadsheet className="w-5 h-5" />
                    <span className="text-sm">.xlsx</span>
                </div>
            </div>

            {error ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {templates.map((t) => (
                    <Card key={t.master} className="border-border/60">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base text-foreground">
                                {t.label}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <Button
                                className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-soft"
                                onClick={() => handleDownload(t.master, t.label)}
                                disabled={!!downloading[t.master]}
                            >
                                {downloading[t.master]
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <FileDown className="w-4 h-4" />
                                }
                                Download Template
                            </Button>
                            <p className="text-xs text-muted-foreground mt-3">
                                Headers are generated from the database schema.
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default TemplatesPage;
