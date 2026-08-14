const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));

const calculateDedicatedSettlement = ({ sumIfas, commissionAmount } = {}) => {
    const normalizedSumIfas = roundCurrency(sumIfas);
    const defaultCommissionAmount = roundCurrency((normalizedSumIfas * 6) / 100);
    const hasRequestedCommission = commissionAmount !== undefined
        && commissionAmount !== null
        && String(commissionAmount).trim() !== '';
    const requestedCommissionAmount = hasRequestedCommission
        ? Number(commissionAmount)
        : defaultCommissionAmount;

    if (!Number.isFinite(requestedCommissionAmount)) {
        throw new Error('Commission amount must be a valid number');
    }

    const safeCommissionAmount = roundCurrency(requestedCommissionAmount);
    if (safeCommissionAmount < 0) {
        throw new Error('Commission amount cannot be negative');
    }
    if (safeCommissionAmount > normalizedSumIfas) {
        throw new Error('Commission amount cannot exceed sum of IFAs');
    }

    return {
        sumIfas: normalizedSumIfas,
        commissionAmount: safeCommissionAmount,
        totalDeductions: safeCommissionAmount,
        settlementBalance: roundCurrency(normalizedSumIfas - safeCommissionAmount),
        commissionPercent: normalizedSumIfas > 0
            ? Number(((safeCommissionAmount / normalizedSumIfas) * 100).toFixed(4))
            : 6
    };
};

module.exports = { calculateDedicatedSettlement, roundCurrency };
