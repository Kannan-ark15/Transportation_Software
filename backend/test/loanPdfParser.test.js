const test = require('node:test');
const assert = require('node:assert/strict');

const {
    parseDateToken,
    parseLoanPdfText,
    parseScheduleRowsFromTokens
} = require('../utils/loanPdfParser');

const sampleTokens = [
    'HDFC BANK LTD',
    'Date: 06/10/2025',
    'Repayment Schedule',
    'Page:0001',
    'Agreement No.',
    '802073299',
    'Loan Type',
    'USED COMMERCIAL VEHICLE LOAN',
    'Tenure.',
    '35',
    'Amount Financed',
    '1,500,000.00',
    'Total Instl.',
    '35',
    'Frequency',
    'Monthly',
    'Instl No',
    'Due Date',
    'Instl Amt',
    'Principal',
    'Interest',
    'O/s Principal',
    '1',
    '01/09/2025',
    '50,310.00',
    '36,531.00',
    '13,779.00',
    '1,463,469.00',
    '2',
    '01/10/2025',
    '50,310.00',
    '36,867.00',
    '13,443.00',
    '1,426,602.00',
    'Page:0002',
    'Agreement No.',
    '802073299',
    'Instl No',
    'Due Date',
    'Instl Amt',
    'Principal',
    'Interest',
    'O/s Principal',
    '3',
    '01/11/2025',
    '50,310.00',
    '37,205.00',
    '13,105.00',
    '1,389,397.00',
    '4',
    '01/12/2025',
    '50,310.00',
    '37,547.00',
    '12,763.00',
    '1,351,850.00',
    'Total :',
    '201,240.00',
    '148,150.00',
    '53,090.00'
];

test('parseDateToken prefers day-first dates for Indian loan schedules', () => {
    assert.equal(parseDateToken('01/09/2025'), '2025-09-01');
    assert.equal(parseDateToken('15/01/2026'), '2026-01-15');
});

test('parseScheduleRowsFromTokens parses rows even when PDF text is split into tokens across pages', () => {
    const rows = parseScheduleRowsFromTokens(sampleTokens);

    assert.equal(rows.length, 4);
    assert.deepEqual(rows[0], {
        installment_number: 1,
        due_date: '2025-09-01',
        principal: 36531,
        interest: 13779,
        due_amount: 50310,
        outstanding_principal: 1463469
    });
    assert.equal(rows[3].due_date, '2025-12-01');
    assert.equal(rows[3].outstanding_principal, 1351850);
});

test('parseLoanPdfText extracts header fields and normalized loan type from tokenized HDFC text', () => {
    const parsed = parseLoanPdfText({
        fullText: sampleTokens.join('\n'),
        tokens: sampleTokens
    });

    assert.equal(parsed.agreementNumber, '802073299');
    assert.equal(parsed.loanType, 'Used Commercial Vehicle Loan');
    assert.equal(parsed.loanAmount, 1500000);
    assert.equal(parsed.tenure, 35);
    assert.equal(parsed.totalInstallments, 35);
    assert.equal(parsed.frequency, 'Monthly');
    assert.equal(parsed.scheduleRows.length, 4);
});
