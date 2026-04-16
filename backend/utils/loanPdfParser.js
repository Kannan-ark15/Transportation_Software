const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

pdfjsLib.GlobalWorkerOptions.workerSrc = '';

const ROW_REGEX = /(\d+)\s+(\d{1,2}[\/|lI-]\d{1,2}[\/|lI-]\d{4})\s+(\d[\d,]*(?:\.\d+)?)\s+(\d[\d,]*(?:\.\d+)?)\s+(\d[\d,]*(?:\.\d+)?)\s+(\d[\d,]*(?:\.\d+)?)/g;

const cleanToken = (value) => String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenizeText = (text) => String(text || '')
    .split(/\s+/)
    .map(cleanToken)
    .filter(Boolean);

const parseIndianNumber = (value) => {
    const normalized = cleanToken(value).replace(/,/g, '');
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const isAmountToken = (token) => /^\d[\d,]*(?:\.\d+)?$/.test(cleanToken(token));

const parseDateToken = (token, { defaultDayFirst = true } = {}) => {
    const normalized = cleanToken(token)
        .replace(/[|lI]/g, '/')
        .replace(/-/g, '/');
    const parts = normalized.split('/');

    if (parts.length !== 3) return null;

    const [first, second, year] = parts.map((part) => Number(part));
    if (!Number.isInteger(first) || !Number.isInteger(second) || !Number.isInteger(year) || year < 1000) {
        return null;
    }

    let day;
    let month;

    if (first > 12 && second <= 12) {
        day = first;
        month = second;
    } else if (second > 12 && first <= 12) {
        month = first;
        day = second;
    } else if (defaultDayFirst) {
        day = first;
        month = second;
    } else {
        month = first;
        day = second;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }

    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const normalizeLoanType = (rawLoanType) => {
    const normalized = cleanToken(rawLoanType);
    const upper = normalized.toUpperCase();

    if (upper.includes('USED COMMERCIAL VEHICLE')) return 'Used Commercial Vehicle Loan';
    if (upper.includes('NEW COMMERCIAL VEHICLE')) return 'New Commercial Vehicle Loan';
    if (upper.includes('COMMERCIAL VEHICLE REFINANCE')) return 'Commercial Vehicle Refinance';
    if (upper.includes('COMMERCIAL VEHICLE TOP-UP')) return 'Commercial Vehicle Top-Up Loan';
    if (upper.includes('COMMERCIAL VEHICLE')) return 'Commercial Vehicle Loan';
    if (upper.includes('TRACTOR')) return 'Tractor Loan';
    if (upper.includes('MACHINERY')) return 'Machinery Loan';
    if (upper.includes('CONSTRUCTION EQUIPMENT')) return 'Construction Equipment Loan';
    if (upper.includes('EQUIPMENT')) return 'Construction Equipment Loan';

    return normalized;
};

const parseHeaderFields = (fullText) => {
    const text = String(fullText || '').replace(/\u00a0/g, ' ');

    const agreementMatch = text.match(/Agreement\s*No[.\s:]*([0-9]+)/i);
    const loanTypeMatch = text.match(/Loan\s*Type\s+([\w\s/()-]+?)(?=Tenure|Amount\s*Financed|Frequency|Currency|Instl\s*No|\n)/i);
    const amountMatch = text.match(/Amount\s*Financed[.\s:]*([\d,]+(?:\.\d+)?)/i);
    const tenureMatch = text.match(/Tenure[.\s:]*(\d+)/i);
    const totalInstMatch = text.match(/Total\s*Inst[l1][.\s:]*(\d+)/i);
    const freqMatch = text.match(/Frequency[.\s:]*(Monthly|Quarterly|Half-Yearly|Yearly|Weekly|Fortnightly)/i);

    return {
        agreementNumber: agreementMatch ? agreementMatch[1] : '',
        loanType: normalizeLoanType(loanTypeMatch ? loanTypeMatch[1] : ''),
        loanAmount: amountMatch ? parseIndianNumber(amountMatch[1]) : null,
        tenure: tenureMatch ? Number(tenureMatch[1]) : null,
        totalInstallments: totalInstMatch ? Number(totalInstMatch[1]) : null,
        frequency: freqMatch
            ? `${freqMatch[1].charAt(0).toUpperCase()}${freqMatch[1].slice(1).toLowerCase()}`
            : 'Monthly'
    };
};

const createScheduleRow = (instNo, rawDate, rawInstAmt, rawPrincipal, rawInterest, rawOsPrincipal) => {
    const dueDate = parseDateToken(rawDate);
    const principal = parseIndianNumber(rawPrincipal);
    const interest = parseIndianNumber(rawInterest);
    const dueAmount = parseIndianNumber(rawInstAmt);
    const outstandingPrincipal = parseIndianNumber(rawOsPrincipal);

    if (!dueDate || principal == null || interest == null || dueAmount == null || outstandingPrincipal == null) {
        return null;
    }

    return {
        installment_number: Number(instNo),
        due_date: dueDate,
        principal,
        interest,
        due_amount: dueAmount,
        outstanding_principal: outstandingPrincipal
    };
};

const parseScheduleRowsFromTokens = (tokens = []) => {
    const rows = [];

    for (let index = 0; index <= tokens.length - 6; index += 1) {
        const [instNo, rawDate, rawInstAmt, rawPrincipal, rawInterest, rawOsPrincipal] = tokens.slice(index, index + 6);

        if (!/^\d+$/.test(cleanToken(instNo))) continue;
        if (!parseDateToken(rawDate)) continue;
        if (![rawInstAmt, rawPrincipal, rawInterest, rawOsPrincipal].every(isAmountToken)) continue;

        const row = createScheduleRow(instNo, rawDate, rawInstAmt, rawPrincipal, rawInterest, rawOsPrincipal);
        if (!row) continue;

        rows.push(row);
        index += 5;
    }

    return rows;
};

const parseScheduleRowsFromText = (text) => {
    const rows = [];
    let match;
    ROW_REGEX.lastIndex = 0;

    while ((match = ROW_REGEX.exec(String(text || ''))) !== null) {
        const row = createScheduleRow(...match.slice(1));
        if (row) rows.push(row);
    }

    return rows;
};

const parseLoanPdfText = ({ fullText = '', tokens = [] } = {}) => {
    const headerFields = parseHeaderFields(fullText);
    const scheduleRows = parseScheduleRowsFromTokens(tokens);

    return {
        ...headerFields,
        scheduleRows: scheduleRows.length > 0 ? scheduleRows : parseScheduleRowsFromText(fullText)
    };
};

const extractNativePdfContent = async (pdfDoc) => {
    const tokens = [];
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum += 1) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageTokens = textContent.items
            .map((item) => cleanToken(item.str))
            .filter(Boolean);

        tokens.push(...pageTokens);
        if (pageTokens.length > 0) {
            fullText += `${pageTokens.join('\n')}\n`;
        }
    }

    return { fullText, tokens };
};

const extractOcrPdfContent = async (pdfDoc) => {
    const { createCanvas } = require('canvas');
    const Tesseract = require('tesseract.js');

    let fullText = '';

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum += 1) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 3.5 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;

        const { data: { text } } = await Tesseract.recognize(canvas.toBuffer('image/png'), 'eng', {
            tessedit_pageseg_mode: '6',
            logger: () => { }
        });

        fullText += `${text}\n`;
    }

    return { fullText, tokens: tokenizeText(fullText) };
};

const mergeParsedLoanData = (primary, fallback) => ({
    agreementNumber: primary.agreementNumber || fallback.agreementNumber || '',
    loanType: primary.loanType || fallback.loanType || '',
    loanAmount: primary.loanAmount ?? fallback.loanAmount ?? null,
    tenure: primary.tenure ?? fallback.tenure ?? null,
    totalInstallments: primary.totalInstallments ?? fallback.totalInstallments ?? null,
    frequency: primary.frequency || fallback.frequency || 'Monthly',
    scheduleRows: primary.scheduleRows?.length ? primary.scheduleRows : (fallback.scheduleRows || [])
});

const parseLoanPdfBuffer = async (pdfBuffer) => {
    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfBuffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
    });
    const pdfDoc = await loadingTask.promise;

    const nativeContent = await extractNativePdfContent(pdfDoc);
    const nativeParsed = parseLoanPdfText(nativeContent);
    if (nativeParsed.scheduleRows.length > 0) {
        return nativeParsed;
    }

    const ocrContent = await extractOcrPdfContent(pdfDoc);
    const ocrParsed = parseLoanPdfText(ocrContent);
    return mergeParsedLoanData(nativeParsed, ocrParsed);
};

module.exports = {
    parseDateToken,
    parseLoanPdfBuffer,
    parseLoanPdfText,
    parseScheduleRowsFromText,
    parseScheduleRowsFromTokens
};
