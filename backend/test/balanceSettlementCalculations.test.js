const assert = require('node:assert/strict');
const test = require('node:test');
const { calculateDedicatedSettlement } = require('../utils/balanceSettlementCalculations');

test('Dedicated/Market defaults commission and total deductions to six percent', () => {
    assert.deepEqual(calculateDedicatedSettlement({ sumIfas: 1000 }), {
        sumIfas: 1000,
        commissionAmount: 60,
        totalDeductions: 60,
        settlementBalance: 940,
        commissionPercent: 6
    });
});

test('Dedicated/Market keeps an explicitly edited commission consistent', () => {
    assert.deepEqual(calculateDedicatedSettlement({ sumIfas: 1234.56, commissionAmount: 74.07 }), {
        sumIfas: 1234.56,
        commissionAmount: 74.07,
        totalDeductions: 74.07,
        settlementBalance: 1160.49,
        commissionPercent: 5.9997
    });
});

test('Dedicated/Market rejects invalid or excessive commission', () => {
    assert.throws(() => calculateDedicatedSettlement({ sumIfas: 100, commissionAmount: -1 }), /cannot be negative/);
    assert.throws(() => calculateDedicatedSettlement({ sumIfas: 100, commissionAmount: 101 }), /cannot exceed/);
});
