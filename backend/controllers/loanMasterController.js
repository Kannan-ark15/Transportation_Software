const pool = require('../config/database');

const VALID_FREQUENCIES = new Set([
    'Monthly',
    'Quarterly',
    'Half-Yearly',
    'Yearly',
    'Weekly',
    'Fortnightly',
    'Bullet Payment',
    'Structured / Custom EMI',
    'N/A'
]);

const VALID_LOAN_TYPES = new Set([
    'Commercial Vehicle Loan',
    'New Commercial Vehicle Loan',
    'Used Commercial Vehicle Loan',
    'Commercial Vehicle Refinance',
    'Commercial Vehicle Top-Up Loan',
    'Fleet Owner Finance',
    'Loan Against Commercial Vehicle (LACV)',
    'Balance Transfer Commercial Vehicle Loan',
    'Refinance with Top-Up',
    'Step-Up EMI Commercial Vehicle Loan',
    'Step-Down EMI Commercial Vehicle Loan',
    'Construction Equipment Loan',
    'Tractor Loan',
    'Farm Equipment Loan',
    'Machinery Loan',
    'Industrial Equipment Loan',
    'Material Handling Equipment Loan',
    'Crane / Earthmover Finance',
    'Generator / DG Set Finance',
    'Working Capital Loan',
    'Business Term Loan',
    'MSME Loan',
    'Mudra Loan (if small operator)',
    'Line of Credit / OD Facility',
    'Cash Credit Loan',
    'Balance Transfer Loan',
    'Refinance Loan',
    'Restructured Loan',
    'Settlement Loan',
    'Top-Up on Existing Loan',
    'Passenger Vehicle Loan',
    'Three Wheeler Loan',
    'Two Wheeler Loan',
    'Electric Vehicle Commercial Loan',
    'Hire Purchase Loan',
    'Lease Financing',
    'Operating Lease',
    'Finance Lease',
    'Other'
]);

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const hasLoanRepaymentTrackingTable = async (client) => {
    const result = await client.query(`SELECT to_regclass('public.loan_repayment_trackings') AS table_name`);
    return Boolean(result.rows[0]?.table_name);
};

const normalizeSchedule = (loanAmount, schedules = []) => {
    let runningOutstanding = Number(toNumber(loanAmount, 0).toFixed(2));
    let totalDue = 0;
    const normalized = [];

    for (let i = 0; i < schedules.length; i += 1) {
        const row = schedules[i] || {};
        const installmentNumber = i + 1;
        const dueDate = row.due_date ? String(row.due_date) : '';
        const principal = Number(toNumber(row.principal, NaN).toFixed(2));
        const interest = Number(toNumber(row.interest, NaN).toFixed(2));

        if (!dueDate) throw new Error(`Due date is required for installment ${installmentNumber}`);
        if (!Number.isFinite(principal) || principal < 0) throw new Error(`Principal is invalid for installment ${installmentNumber}`);
        if (!Number.isFinite(interest) || interest < 0) throw new Error(`Interest is invalid for installment ${installmentNumber}`);

        const dueAmount = Number((principal + interest).toFixed(2));
        runningOutstanding = Number((runningOutstanding - principal).toFixed(2));
        if (runningOutstanding < -0.01) throw new Error(`Principal exceeds loan amount at installment ${installmentNumber}`);
        const outstandingPrincipal = runningOutstanding < 0 ? 0 : runningOutstanding;

        normalized.push({
            installment_number: installmentNumber,
            due_date: dueDate,
            principal,
            interest,
            due_amount: dueAmount,
            outstanding_principal: Number(outstandingPrincipal.toFixed(2))
        });

        totalDue += dueAmount;
    }

    return { normalized, totalDue: Number(totalDue.toFixed(2)) };
};

const getLoanMasterMeta = async (req, res, next) => {
    try {
        const [banksRes, vehiclesRes] = await Promise.all([
            pool.query(
                `SELECT id, bank_name, branch, account_no, ifsc_code
                 FROM banks
                 WHERE COALESCE(status, 'Active') = 'Active'
                 ORDER BY bank_name ASC, branch ASC`
            ),
            pool.query(
                `SELECT id, vehicle_no, vehicle_type, vehicle_sub_type, owner_name
                 FROM vehicles
                 WHERE COALESCE(status, 'Active') = 'Active'
                   AND COALESCE(vehicle_financial_status, 'Free') = 'Loan'
                 ORDER BY vehicle_no ASC`
            )
        ]);

        res.status(200).json({
            success: true,
            data: {
                banks: banksRes.rows,
                vehicles: vehiclesRes.rows,
                frequencies: Array.from(VALID_FREQUENCIES),
                loan_types: Array.from(VALID_LOAN_TYPES)
            }
        });
    } catch (error) {
        next(error);
    }
};

const getAllLoanMasters = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT
                lm.*,
                COALESCE(b.bank_name, lm.bank_name) AS bank_name,
                COALESCE(v.vehicle_no, lm.vehicle_number) AS vehicle_number
             FROM loan_masters lm
             LEFT JOIN banks b ON b.id = lm.bank_id
             LEFT JOIN vehicles v ON v.id = lm.vehicle_id
             ORDER BY lm.created_at DESC`
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
};

const getLoanMasterById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const masterRes = await pool.query(
            `SELECT
                lm.*,
                COALESCE(b.bank_name, lm.bank_name) AS bank_name,
                COALESCE(v.vehicle_no, lm.vehicle_number) AS vehicle_number
             FROM loan_masters lm
             LEFT JOIN banks b ON b.id = lm.bank_id
             LEFT JOIN vehicles v ON v.id = lm.vehicle_id
             WHERE lm.id = $1`,
            [id]
        );
        if (masterRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Loan master not found' });
        }

        const scheduleRes = await pool.query(
            `SELECT installment_number, due_date, principal, interest, due_amount, outstanding_principal
             FROM loan_master_schedules
             WHERE loan_master_id = $1
             ORDER BY installment_number ASC`,
            [id]
        );

        res.status(200).json({
            success: true,
            data: {
                ...masterRes.rows[0],
                schedules: scheduleRes.rows
            }
        });
    } catch (error) {
        next(error);
    }
};

const createLoanMaster = async (req, res, next) => {
    const client = await pool.connect();
    let inTx = false;
    try {
        const {
            bank_id,
            vehicle_id,
            financier,
            agreement_number,
            loan_type,
            other_loan_type,
            loan_amount,
            tenure,
            total_installments,
            frequency,
            schedules = []
        } = req.body;

        const parsedBankId = Number(bank_id);
        const parsedVehicleId = Number(vehicle_id);
        const parsedLoanAmount = Number(toNumber(loan_amount, NaN).toFixed(2));
        const parsedTenure = Number(tenure);
        const parsedTotalInstallments = Number(total_installments);
        const agreementValue = String(agreement_number || '').trim();

        if (!Number.isInteger(parsedBankId) || parsedBankId <= 0) return res.status(400).json({ success: false, message: 'Valid bank is required' });
        if (!Number.isInteger(parsedVehicleId) || parsedVehicleId <= 0) return res.status(400).json({ success: false, message: 'Valid vehicle is required' });
        if (!/^\d+$/.test(agreementValue)) return res.status(400).json({ success: false, message: 'Agreement number must be numeric' });
        if (!VALID_LOAN_TYPES.has(loan_type)) return res.status(400).json({ success: false, message: 'Loan type is invalid' });
        if (loan_type === 'Other' && !String(other_loan_type || '').trim()) return res.status(400).json({ success: false, message: 'Other loan type is required when loan type is Other' });
        if (!Number.isFinite(parsedLoanAmount) || parsedLoanAmount <= 0) return res.status(400).json({ success: false, message: 'Loan amount must be greater than 0' });
        if (!Number.isInteger(parsedTenure) || parsedTenure <= 0) return res.status(400).json({ success: false, message: 'Tenure must be a positive number' });
        if (!Number.isInteger(parsedTotalInstallments) || parsedTotalInstallments <= 0) return res.status(400).json({ success: false, message: 'Total installments must be a positive number' });
        if (!VALID_FREQUENCIES.has(frequency)) return res.status(400).json({ success: false, message: 'Frequency is invalid' });
        if (!Array.isArray(schedules) || schedules.length !== parsedTotalInstallments) {
            return res.status(400).json({ success: false, message: 'Schedule rows must match total installments' });
        }

        const [bankRes, vehicleRes] = await Promise.all([
            client.query(
                `SELECT id, bank_name
                 FROM banks
                 WHERE id = $1`,
                [parsedBankId]
            ),
            client.query(
                `SELECT id, vehicle_no
                 FROM vehicles
                 WHERE id = $1
                   AND COALESCE(vehicle_financial_status, 'Free') = 'Loan'`,
                [parsedVehicleId]
            )
        ]);

        if (bankRes.rows.length === 0) return res.status(400).json({ success: false, message: 'Selected bank does not exist' });
        if (vehicleRes.rows.length === 0) return res.status(400).json({ success: false, message: 'Selected vehicle is not eligible for loan master' });

        const { normalized, totalDue } = normalizeSchedule(parsedLoanAmount, schedules);
        const trackingTableExists = await hasLoanRepaymentTrackingTable(client);

        await client.query('BEGIN');
        inTx = true;

        const masterRes = await client.query(
            `INSERT INTO loan_masters
                (bank_id, bank_name, vehicle_id, vehicle_number, financier, agreement_number,
                 loan_type, other_loan_type, loan_amount, tenure, total_installments, frequency, total_due)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING *`,
            [
                parsedBankId,
                bankRes.rows[0].bank_name,
                parsedVehicleId,
                vehicleRes.rows[0].vehicle_no,
                financier || null,
                agreementValue,
                loan_type,
                loan_type === 'Other' ? String(other_loan_type || '').trim() : null,
                parsedLoanAmount,
                parsedTenure,
                parsedTotalInstallments,
                frequency,
                totalDue
            ]
        );

        const loanMaster = masterRes.rows[0];
        const insertScheduleSql = `INSERT INTO loan_master_schedules
            (loan_master_id, installment_number, due_date, principal, interest, due_amount, outstanding_principal)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING id`;
        const insertTrackingSql = `INSERT INTO loan_repayment_trackings
            (loan_master_id, loan_master_schedule_id, installment_number, due_date, principal, interest, due_amount, outstanding_principal, due_settled)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE)
            ON CONFLICT (loan_master_schedule_id) DO UPDATE
            SET installment_number = EXCLUDED.installment_number,
                due_date = EXCLUDED.due_date,
                principal = EXCLUDED.principal,
                interest = EXCLUDED.interest,
                due_amount = EXCLUDED.due_amount,
                outstanding_principal = EXCLUDED.outstanding_principal,
                updated_at = CURRENT_TIMESTAMP`;

        for (const row of normalized) {
            const scheduleRes = await client.query(insertScheduleSql, [
                loanMaster.id,
                row.installment_number,
                row.due_date,
                row.principal,
                row.interest,
                row.due_amount,
                row.outstanding_principal
            ]);

            if (trackingTableExists) {
                await client.query(insertTrackingSql, [
                    loanMaster.id,
                    scheduleRes.rows[0].id,
                    row.installment_number,
                    row.due_date,
                    row.principal,
                    row.interest,
                    row.due_amount,
                    row.outstanding_principal
                ]);
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, data: loanMaster });
    } catch (error) {
        if (inTx) await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

const updateLoanMaster = async (req, res, next) => {
    const client = await pool.connect();
    let inTx = false;
    try {
        const { id } = req.params;
        const {
            bank_id,
            vehicle_id,
            financier,
            agreement_number,
            loan_type,
            other_loan_type,
            loan_amount,
            tenure,
            total_installments,
            frequency,
            schedules = []
        } = req.body;

        const existsRes = await client.query('SELECT id FROM loan_masters WHERE id = $1', [id]);
        if (existsRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Loan master not found' });

        const parsedBankId = Number(bank_id);
        const parsedVehicleId = Number(vehicle_id);
        const parsedLoanAmount = Number(toNumber(loan_amount, NaN).toFixed(2));
        const parsedTenure = Number(tenure);
        const parsedTotalInstallments = Number(total_installments);
        const agreementValue = String(agreement_number || '').trim();

        if (!Number.isInteger(parsedBankId) || parsedBankId <= 0) return res.status(400).json({ success: false, message: 'Valid bank is required' });
        if (!Number.isInteger(parsedVehicleId) || parsedVehicleId <= 0) return res.status(400).json({ success: false, message: 'Valid vehicle is required' });
        if (!/^\d+$/.test(agreementValue)) return res.status(400).json({ success: false, message: 'Agreement number must be numeric' });
        if (!VALID_LOAN_TYPES.has(loan_type)) return res.status(400).json({ success: false, message: 'Loan type is invalid' });
        if (loan_type === 'Other' && !String(other_loan_type || '').trim()) return res.status(400).json({ success: false, message: 'Other loan type is required when loan type is Other' });
        if (!Number.isFinite(parsedLoanAmount) || parsedLoanAmount <= 0) return res.status(400).json({ success: false, message: 'Loan amount must be greater than 0' });
        if (!Number.isInteger(parsedTenure) || parsedTenure <= 0) return res.status(400).json({ success: false, message: 'Tenure must be a positive number' });
        if (!Number.isInteger(parsedTotalInstallments) || parsedTotalInstallments <= 0) return res.status(400).json({ success: false, message: 'Total installments must be a positive number' });
        if (!VALID_FREQUENCIES.has(frequency)) return res.status(400).json({ success: false, message: 'Frequency is invalid' });
        if (!Array.isArray(schedules) || schedules.length !== parsedTotalInstallments) {
            return res.status(400).json({ success: false, message: 'Schedule rows must match total installments' });
        }

        const [bankRes, vehicleRes] = await Promise.all([
            client.query(
                `SELECT id, bank_name
                 FROM banks
                 WHERE id = $1`,
                [parsedBankId]
            ),
            client.query(
                `SELECT id, vehicle_no
                 FROM vehicles
                 WHERE id = $1
                   AND COALESCE(vehicle_financial_status, 'Free') = 'Loan'`,
                [parsedVehicleId]
            )
        ]);

        if (bankRes.rows.length === 0) return res.status(400).json({ success: false, message: 'Selected bank does not exist' });
        if (vehicleRes.rows.length === 0) return res.status(400).json({ success: false, message: 'Selected vehicle is not eligible for loan master' });

        const { normalized, totalDue } = normalizeSchedule(parsedLoanAmount, schedules);
        const trackingTableExists = await hasLoanRepaymentTrackingTable(client);

        await client.query('BEGIN');
        inTx = true;

        const updateRes = await client.query(
            `UPDATE loan_masters
             SET bank_id = $2,
                 bank_name = $3,
                 vehicle_id = $4,
                 vehicle_number = $5,
                 financier = $6,
                 agreement_number = $7,
                 loan_type = $8,
                 other_loan_type = $9,
                 loan_amount = $10,
                 tenure = $11,
                 total_installments = $12,
                 frequency = $13,
                 total_due = $14,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [
                id,
                parsedBankId,
                bankRes.rows[0].bank_name,
                parsedVehicleId,
                vehicleRes.rows[0].vehicle_no,
                financier || null,
                agreementValue,
                loan_type,
                loan_type === 'Other' ? String(other_loan_type || '').trim() : null,
                parsedLoanAmount,
                parsedTenure,
                parsedTotalInstallments,
                frequency,
                totalDue
            ]
        );

        if (trackingTableExists) {
            await client.query('DELETE FROM loan_repayment_trackings WHERE loan_master_id = $1', [id]);
        }
        await client.query('DELETE FROM loan_master_schedules WHERE loan_master_id = $1', [id]);

        const insertScheduleSql = `INSERT INTO loan_master_schedules
            (loan_master_id, installment_number, due_date, principal, interest, due_amount, outstanding_principal)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING id`;
        const insertTrackingSql = `INSERT INTO loan_repayment_trackings
            (loan_master_id, loan_master_schedule_id, installment_number, due_date, principal, interest, due_amount, outstanding_principal, due_settled)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE)
            ON CONFLICT (loan_master_schedule_id) DO UPDATE
            SET installment_number = EXCLUDED.installment_number,
                due_date = EXCLUDED.due_date,
                principal = EXCLUDED.principal,
                interest = EXCLUDED.interest,
                due_amount = EXCLUDED.due_amount,
                outstanding_principal = EXCLUDED.outstanding_principal,
                updated_at = CURRENT_TIMESTAMP`;
        for (const row of normalized) {
            const scheduleRes = await client.query(insertScheduleSql, [
                id,
                row.installment_number,
                row.due_date,
                row.principal,
                row.interest,
                row.due_amount,
                row.outstanding_principal
            ]);

            if (trackingTableExists) {
                await client.query(insertTrackingSql, [
                    id,
                    scheduleRes.rows[0].id,
                    row.installment_number,
                    row.due_date,
                    row.principal,
                    row.interest,
                    row.due_amount,
                    row.outstanding_principal
                ]);
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ success: true, data: updateRes.rows[0] });
    } catch (error) {
        if (inTx) await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

const deleteLoanMaster = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM loan_masters WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Loan master not found' });
        res.status(200).json({ success: true, message: 'Loan master deleted successfully' });
    } catch (error) {
        next(error);
    }
};



const parseLoanPDF = async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    }

    try {
        // ── Dynamically require pdfjs-dist and tesseract.js (pure Node, no system tools) ──
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
        const { createCanvas } = require('canvas');
        const Tesseract = require('tesseract.js');

        // Disable worker for Node.js environment
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';

        const pdfBuffer = req.file.buffer;
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true });
        const pdfDoc = await loadingTask.promise;

        let fullText = '';

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const scale = 3.5; // high DPI for accurate OCR
            const viewport = page.getViewport({ scale });

            const canvas = createCanvas(viewport.width, viewport.height);
            const ctx = canvas.getContext('2d');

            await page.render({ canvasContext: ctx, viewport }).promise;

            const { data: { text } } = await Tesseract.recognize(canvas.toBuffer('image/png'), 'eng', {
                tessedit_pageseg_mode: '6',
                logger: () => { }
            });

            fullText += text + '\n';
        }

        // ── Parse header fields ──────────────────────────────────────────────
        const parseIndianNumber = (str) => {
            if (!str) return null;
            const n = Number(String(str).replace(/,/g, '').trim());
            return isNaN(n) ? null : n;
        };

        const agreementMatch = fullText.match(/Agreement\s*No[.\s:]*([0-9]+)/i);
        const agreementNumber = agreementMatch ? agreementMatch[1] : '';

        const loanTypeMatch = fullText.match(/Loan\s*Type\s+([\w\s/()-]+?)(?=Tenure|Amount\s*Financed|Frequency|Currency|\n)/i);
        const rawLoanType = loanTypeMatch ? loanTypeMatch[1].replace(/\s+/g, ' ').trim() : '';
        const normLoanType = (() => {
            const u = rawLoanType.toUpperCase();
            if (u.includes('COMMERCIAL VEHICLE')) return 'Commercial Vehicle Loan';
            if (u.includes('TRACTOR')) return 'Tractor Loan';
            if (u.includes('MACHINERY')) return 'Machinery Loan';
            if (u.includes('EQUIPMENT')) return 'Construction Equipment Loan';
            return rawLoanType || '';
        })();

        const amountMatch = fullText.match(/Amount\s*Financed\s+([\d,]+\.?\d*)/i);
        const loanAmount = amountMatch ? parseIndianNumber(amountMatch[1]) : null;

        const tenureMatch = fullText.match(/Tenure[.\s:]*(\d+)/i);
        const tenure = tenureMatch ? Number(tenureMatch[1]) : null;

        const totalInstMatch = fullText.match(/Total\s*Inst[l1][.\s:]*(\d+)/i);
        const totalInstallments = totalInstMatch ? Number(totalInstMatch[1]) : null;

        const freqMatch = fullText.match(/Frequency\s+(Monthly|Quarterly|Half-Yearly|Yearly|Weekly|Fortnightly)/i);
        const frequency = freqMatch
            ? freqMatch[1].charAt(0).toUpperCase() + freqMatch[1].slice(1).toLowerCase()
            : 'Monthly';

        // ── Parse schedule rows ──────────────────────────────────────────────
        const rowRegex = /(\d+)\s+(\d{2}[/|l]\d{2}[/|l]\d{4})\s+(\d[\d,]*(?:\.\d+)?)\s+(\d[\d,]*(?:\.\d+)?)\s+(\d[\d,]*(?:\.\d+)?)\s+(\d[\d,]*(?:\.\d+)?)/g;

        const scheduleRows = [];
        let match;
        while ((match = rowRegex.exec(fullText)) !== null) {
            const [, instNo, rawDate, rawInstAmt, rawPrincipal, rawInterest, rawOsPrincipal] = match;
            const cleanDate = rawDate.replace(/[|l]/g, '/');
            const [mm, dd, yyyy] = cleanDate.split('/');
            if (!mm || !dd || !yyyy || yyyy.length !== 4) continue;
            const dueDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
            const principal = parseIndianNumber(rawPrincipal);
            const interest = parseIndianNumber(rawInterest);
            scheduleRows.push({
                installment_number: Number(instNo),
                due_date: dueDate,
                principal,
                interest,
                due_amount: parseIndianNumber(rawInstAmt),
                outstanding_principal: parseIndianNumber(rawOsPrincipal)
            });
        }

        if (scheduleRows.length === 0) {
            return res.status(422).json({ success: false, message: 'No schedule rows found in PDF. Please check the file format.' });
        }

        res.json({
            success: true,
            data: {
                agreementNumber,
                loanType: normLoanType,
                loanAmount,
                tenure,
                totalInstallments,
                frequency,
                scheduleRows
            }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getLoanMasterMeta,
    getAllLoanMasters,
    getLoanMasterById,
    createLoanMaster,
    updateLoanMaster,
    deleteLoanMaster,
    parseLoanPDF
};
