import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- IMPORT FUNCTIONS ---

/**
 * Parses an uploaded file (Excel/CSV) and returns an array of JSON objects.
 * @param {File} file - The file object from input.
 * @returns {Promise<Array>} - Array of data rows.
 */
export const parseImportData = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {
                    type: 'array',
                    cellDates: true, // Auto-convert Excel dates to JS Dates
                    dateNF: 'yyyy-mm-dd' // Default date format
                });

                // Read the first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

// --- EXPORT FUNCTIONS ---

/**
 * Export data to an Excel file (.xlsx)
 * @param {Array} data - Array of objects to export.
 * @param {string} fileName - Name of the output file (without extension).
 */
export const exportToExcel = (data, fileName) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Export an Excel template with only headers (no data rows).
 * @param {Array<string>} headers - Header labels for the first row.
 * @param {string} fileName - Name of the output file (without extension).
 * @param {string} sheetName - Excel sheet name.
 */
export const exportHeadersTemplateToExcel = (headers, fileName, sheetName = 'Template') => {
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Export data to a PDF file with a table.
 * @param {string} title - Title of the PDF document.
 * @param {Array} columns - Array of objects { header: 'Name', dataKey: 'name' }
 * @param {Array} data - Array of data objects.
 * @param {string} fileName - Name of the output file (without extension).
 */
export const exportToPDF = (title, columns, data, fileName) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    // Config
    const tableColumn = columns.map(col => col.header);
    const tableRows = [];

    data.forEach(row => {
        const rowData = columns.map(col => row[col.dataKey] || '');
        tableRows.push(rowData);
    });

    // Validating autoTable
    if (doc.autoTable) {
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [66, 133, 244] } // Blue header
        });
        doc.save(`${fileName}.pdf`);
    } else {
        console.error("jsPDF-AutoTable plugin not found");
        alert("PDF Export failed: Plugin missing.");
    }
};
