const pool = require('../config/database');

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const round2 = (value) => Number(toNumber(value, 0).toFixed(2));

/**
 * Derive fiscal filing period from a date string (Apr–Mar fiscal year).
 * e.g. 2025-06-15 → "2025-2026", 2026-02-10 → "2025-2026"
 */
const getFilingPeriodFromDate = (dateString) => {
    const date = new Date(`${dateString}T00:00:00`);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    if (month >= 4) return `${year}-${year + 1}`;
    return `${year - 1}-${year}`;
};

/**
 * Derive MMMYYYY filing period label from a date string.
 * e.g. 2025-06-15 → "Jun2025"
 */
const getMonthYearLabel = (dateString) => {
    const date = new Date(`${dateString}T00:00:00`);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]}${date.getFullYear()}`;
};

/**
 * GET /api/gst-filing
 *
 * Returns a summary of GST filing data per filing period, aggregating:
 * - Sales GST (Output GST) from gst_invoices.total_gst
 * - Purchase GST (Input GST) from itc_ledger_entries.total_gst
 * - Payable GST = Sales GST - Purchase GST
 */
const getGstFilingSummary = async (req, res, next) => {
    try {
        // 1. Sales GST (Output GST) - grouped by filing_period
        const salesGstRes = await pool.query(`
            SELECT
                filing_period,
                COALESCE(SUM(total_gst), 0)::DECIMAL(12, 2) AS sales_gst,
                COUNT(*)::INTEGER AS invoice_count,
                MIN(bill_date) AS period_start,
                MAX(bill_date) AS period_end
            FROM gst_invoices
            GROUP BY filing_period
            ORDER BY filing_period DESC
        `);

        // 2. Purchase GST (Input GST) - grouped by fiscal year derived from invoice_date
        const purchaseGstRes = await pool.query(`
            SELECT
                CASE
                    WHEN EXTRACT(MONTH FROM invoice_date) >= 4
                    THEN EXTRACT(YEAR FROM invoice_date)::TEXT || '-' || (EXTRACT(YEAR FROM invoice_date) + 1)::TEXT
                    ELSE (EXTRACT(YEAR FROM invoice_date) - 1)::TEXT || '-' || EXTRACT(YEAR FROM invoice_date)::TEXT
                END AS filing_period,
                COALESCE(SUM(total_gst), 0)::DECIMAL(12, 2) AS purchase_gst,
                COUNT(*)::INTEGER AS entry_count
            FROM itc_ledger_entries
            GROUP BY filing_period
            ORDER BY filing_period DESC
        `);

        // Build a map of all filing periods
        const periodMap = new Map();

        for (const row of salesGstRes.rows) {
            periodMap.set(row.filing_period, {
                filing_period: row.filing_period,
                sales_gst: round2(row.sales_gst),
                purchase_gst: 0,
                payable_gst: 0,
                invoice_count: toNumber(row.invoice_count, 0),
                itc_entry_count: 0,
                period_start: row.period_start,
                period_end: row.period_end
            });
        }

        for (const row of purchaseGstRes.rows) {
            const existing = periodMap.get(row.filing_period);
            if (existing) {
                existing.purchase_gst = round2(row.purchase_gst);
                existing.itc_entry_count = toNumber(row.entry_count, 0);
            } else {
                periodMap.set(row.filing_period, {
                    filing_period: row.filing_period,
                    sales_gst: 0,
                    purchase_gst: round2(row.purchase_gst),
                    payable_gst: 0,
                    invoice_count: 0,
                    itc_entry_count: toNumber(row.entry_count, 0),
                    period_start: null,
                    period_end: null
                });
            }
        }

        // Calculate payable GST for each period
        const periods = Array.from(periodMap.values()).map(period => ({
            ...period,
            payable_gst: round2(period.sales_gst - period.purchase_gst)
        }));

        // Sort descending
        periods.sort((a, b) => {
            if (a.filing_period > b.filing_period) return -1;
            if (a.filing_period < b.filing_period) return 1;
            return 0;
        });

        // Also compute overall totals
        const totals = {
            total_sales_gst: round2(periods.reduce((sum, p) => sum + p.sales_gst, 0)),
            total_purchase_gst: round2(periods.reduce((sum, p) => sum + p.purchase_gst, 0)),
            total_payable_gst: round2(periods.reduce((sum, p) => sum + p.payable_gst, 0))
        };

        res.status(200).json({
            success: true,
            data: {
                periods,
                totals
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getGstFilingSummary
};
