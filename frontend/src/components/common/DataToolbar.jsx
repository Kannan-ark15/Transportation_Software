import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Download,
    Upload,
    FileSpreadsheet,
    FileText,
    Loader2
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parseImportData, exportToExcel, exportToPDF } from '@/lib/fileUtils';

/**
 * Reusable Toolbar for Import/Export operations.
 * @param {Function} onImport - Callback function receiving parsed data array.
 * @param {Array} data - The current dataset to export.
 * @param {Array} columns - Column definitions for PDF export [{ header, dataKey }].
 * @param {string} title - Title for exports.
 * @param {string} fileName - Filename for saved files.
 */
const DataToolbar = ({ onImport, data, columns, title, fileName }) => {
    const fileInputRef = useRef(null);
    const [importing, setImporting] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setImporting(true);
            const jsonData = await parseImportData(file);

            // Clean keys: trim spaces, lowercase (optional normalization could go here)
            // For now, passing raw data to parent to handle mapping validation
            if (onImport) {
                await onImport(jsonData);
            }
        } catch (error) {
            console.error("Import Error:", error);
            alert("Failed to parse file. Please ensure it is a valid Excel or CSV.");
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleExportExcel = () => {
        // Flatten data if needed? For now dumping raw
        // Maybe parent should pass "exportData" if it needs formatting.
        // We'll trust 'data' is clean enough or simple enough.
        exportToExcel(data, fileName || 'export');
    };

    const handleExportPDF = () => {
        exportToPDF(title || 'Report', columns, data, fileName || 'export');
    };

    return (
        <div className="flex gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".xlsx,.xls,.csv"
            />

            <Button
                variant="outline"
                className="gap-2 text-foreground bg-white/70 border-border/60 hover:bg-muted/70"
                onClick={() => fileInputRef.current.click()}
                disabled={importing}
            >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 text-accent bg-accent/10 border-border/60 hover:bg-accent/15">
                        <Download className="w-4 h-4" />
                        Export
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Choose Format</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                        <FileSpreadsheet className="w-4 h-4 text-accent" /> Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                        <FileText className="w-4 h-4 text-destructive" /> PDF (.pdf)
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default DataToolbar;
