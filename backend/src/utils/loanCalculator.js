// loanCalculator.js
// Pure mathematical functions for EMI, interest accrual, and loan repayment breakdowns.

/**
 * Calculates the Equated Monthly Installment (EMI) for reducing-balance, flat-rate, or zero-interest loans.
 *
 * @param {Object} params
 * @param {number} params.principal - Principal loan amount (P)
 * @param {number} params.annualRate - Annual interest rate in percent (e.g. 10.5 for 10.5%)
 * @param {number} params.tenureMonths - Loan duration in months (n)
 * @param {string} [params.frequency='MONTHLY'] - Repayment frequency: 'MONTHLY', 'QUARTERLY', 'YEARLY', 'BI_WEEKLY', 'WEEKLY'
 * @param {string} [params.calculationMethod='REDUCING_BALANCE'] - 'REDUCING_BALANCE', 'FLAT_RATE', 'ZERO_INTEREST'
 * @returns {number} Calculated periodic EMI amount (rounded to 2 decimal places)
 */
function calculateEmi({
  principal,
  annualRate = 0,
  tenureMonths,
  frequency = 'MONTHLY',
  calculationMethod = 'REDUCING_BALANCE',
}) {
  const P = Number(principal);
  if (isNaN(P) || P <= 0) return 0;

  const N_months = Number(tenureMonths);
  if (isNaN(N_months) || N_months <= 0) return P;

  const R_annual = Number(annualRate) || 0;
  const freq = String(frequency || 'MONTHLY').toUpperCase();
  const method = String(calculationMethod || 'REDUCING_BALANCE').toUpperCase();

  // Determine installments per year and total installment count (n)
  let installmentsPerYear = 12;
  let n = N_months;

  switch (freq) {
    case 'QUARTERLY':
      installmentsPerYear = 4;
      n = Math.max(1, Math.round(N_months / 3));
      break;
    case 'YEARLY':
      installmentsPerYear = 1;
      n = Math.max(1, Math.round(N_months / 12));
      break;
    case 'BI_WEEKLY':
      installmentsPerYear = 26;
      n = Math.max(1, Math.round(N_months * (26 / 12)));
      break;
    case 'WEEKLY':
      installmentsPerYear = 52;
      n = Math.max(1, Math.round(N_months * (52 / 12)));
      break;
    case 'MONTHLY':
    default:
      installmentsPerYear = 12;
      n = Math.max(1, Math.round(N_months));
      break;
  }

  // Zero-interest loan
  if (R_annual <= 0 || method === 'ZERO_INTEREST') {
    return Number((P / n).toFixed(2));
  }

  // Flat-rate loan
  if (method === 'FLAT_RATE') {
    const totalInterest = P * (R_annual / 100) * (N_months / 12);
    return Number(((P + totalInterest) / n).toFixed(2));
  }

  // Reducing balance loan: EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
  const r = R_annual / (installmentsPerYear * 100);
  const factor = Math.pow(1 + r, n);
  if (factor === 1 || isNaN(factor)) {
    return Number((P / n).toFixed(2));
  }

  const emi = P * r * (factor / (factor - 1));
  return Number(emi.toFixed(2));
}

function parseDateOnly(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return Date.UTC(val.getFullYear(), val.getMonth(), val.getDate());
  }
  const str = String(val).slice(0, 10);
  const parts = str.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return Date.UTC(parts[0], parts[1] - 1, parts[2]);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Calculates the exact principal and interest split for a loan repayment based on the
 * actual payment date, outstanding principal, elapsed period, and interest convention.
 *
 * @param {Object} params
 * @param {number} params.outstandingPrincipal - Current remaining loan balance (P)
 * @param {number} params.annualRate - Annual interest rate in percent (e.g. 12 for 12%)
 * @param {number} params.paymentAmount - Total amount paid by user (A)
 * @param {string|Date} [params.paymentDate] - Date repayment is made
 * @param {string|Date} [params.lastPaymentDate] - Date of the immediately preceding payment
 * @param {string|Date} [params.startDate] - Loan start date (fallback reference date)
 * @param {string|Date} [params.dueDate] - Next scheduled due date
 * @param {string} [params.frequency='MONTHLY'] - Repayment frequency
 * @param {string} [params.calculationMethod='REDUCING_BALANCE'] - 'REDUCING_BALANCE', 'FLAT_RATE', 'ZERO_INTEREST'
 * @returns {Object} Detailed breakdown of principal, interest, new remaining balance, and explanation
 */
function calculateRepaymentBreakdown({
  outstandingPrincipal,
  annualRate = 0,
  paymentAmount,
  paymentDate,
  lastPaymentDate,
  startDate,
  dueDate,
  frequency = 'MONTHLY',
  calculationMethod = 'REDUCING_BALANCE',
}) {
  const P_out = Math.max(0, Number(outstandingPrincipal) || 0);
  const A = Math.max(0, Number(paymentAmount) || 0);
  const R = Math.max(0, Number(annualRate) || 0);
  const method = String(calculationMethod || 'REDUCING_BALANCE').toUpperCase();

  // If loan is already fully repaid
  if (P_out <= 0) {
    return {
      totalPayment: A,
      principalAmount: 0,
      principalPortion: 0,
      interestAmount: 0,
      interestPortion: 0,
      unpaidInterest: 0,
      unpaidInterestCarriedForward: 0,
      excessPayment: A,
      remainingBalance: 0,
      remainingPrincipalAfterPayment: 0,
      daysElapsed: 0,
      isStandardCadence: false,
      annualRate: R,
      calculationMethod: method,
      isFullRepayment: true,
      explanation: 'Loan is already fully repaid. No outstanding principal remaining.',
    };
  }

  // Determine reference start date for interest accrual period (Timezone-agnostic UTC days)
  const payTime = parseDateOnly(paymentDate) || Date.now();
  let refTime = null;

  if (lastPaymentDate) {
    refTime = parseDateOnly(lastPaymentDate);
  } else if (startDate) {
    refTime = parseDateOnly(startDate);
  } else if (dueDate) {
    const d = new Date(dueDate);
    d.setUTCMonth(d.getUTCMonth() - 1);
    refTime = parseDateOnly(d);
  } else {
    const d = new Date(payTime);
    d.setUTCMonth(d.getUTCMonth() - 1);
    refTime = parseDateOnly(d);
  }

  // Calculate elapsed days
  const msPerDay = 86400000;
  const daysElapsed = Math.max(0, Math.round((payTime - refTime) / msPerDay));

  let accruedInterest = 0;

  // 1. Zero Interest Loan
  if (R === 0 || method === 'ZERO_INTEREST') {
    accruedInterest = 0;
  }
  // 2. Same-day repayment: 0 days elapsed -> no double interest charged
  else if (daysElapsed === 0) {
    accruedInterest = 0;
  }
  // 3. Reducing Balance
  else if (method === 'REDUCING_BALANCE') {
    // If repayment is on standard monthly cadence (approx 28-31 days):
    // Periodic monthly interest = Outstanding Principal * (Annual Rate / 12 / 100)
    if (daysElapsed >= 28 && daysElapsed <= 31) {
      const monthlyRate = R / (12 * 100);
      accruedInterest = Number((P_out * monthlyRate).toFixed(2));
    } else {
      // Early, late, or irregular repayment: actual daily accrual (Actual/365 convention)
      const dailyRate = R / (365 * 100);
      accruedInterest = Number((P_out * dailyRate * daysElapsed).toFixed(2));
    }
  }
  // 4. Flat Rate Loan
  else if (method === 'FLAT_RATE') {
    if (daysElapsed >= 28 && daysElapsed <= 31) {
      accruedInterest = Number((P_out * (R / (12 * 100))).toFixed(2));
    } else {
      accruedInterest = Number((P_out * (R / (365 * 100)) * daysElapsed).toFixed(2));
    }
  }

  // Split payment between interest and principal
  let interestPortion = 0;
  let principalPortion = 0;
  let unpaidInterest = 0;
  let excessPayment = 0;
  let newRemaining = P_out;
  let explanation = '';

  if (A <= accruedInterest) {
    // Insufficient payment to cover accrued interest
    interestPortion = A;
    principalPortion = 0;
    unpaidInterest = Number((accruedInterest - A).toFixed(2));
    newRemaining = P_out;
    explanation = `Payment of ₹${A.toLocaleString('en-IN', { minimumFractionDigits: 2 })} is insufficient to cover accrued interest of ₹${accruedInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${daysElapsed} days at ${R}% p.a.). Entire payment was applied to interest; unpaid interest of ₹${unpaidInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })} carried forward; principal balance remains ₹${newRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`;
  } else {
    // Payment covers interest and reduces principal
    interestPortion = accruedInterest;
    const potentialPrincipal = Number((A - interestPortion).toFixed(2));

    if (potentialPrincipal >= P_out) {
      // Full loan payoff or excess payment
      principalPortion = P_out;
      excessPayment = Number((potentialPrincipal - P_out).toFixed(2));
      newRemaining = 0;
      explanation = `Loan fully repaid! Payment covers interest of ₹${interestPortion.toLocaleString('en-IN', { minimumFractionDigits: 2 })} and outstanding principal of ₹${P_out.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Final balance is ₹0.00.${excessPayment > 0 ? ` Excess amount of ₹${excessPayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.` : ''}`;
    } else {
      // Normal reducing principal payment
      principalPortion = potentialPrincipal;
      newRemaining = Number((P_out - principalPortion).toFixed(2));
      explanation = `Periodic interest of ₹${interestPortion.toLocaleString('en-IN', { minimumFractionDigits: 2 })} calculated on outstanding balance of ₹${P_out.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${daysElapsed} days at ${R}% p.a.). Principal reduced by ₹${principalPortion.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to ₹${newRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`;
    }
  }

  return {
    totalPayment: A,
    principalAmount: principalPortion,
    principalPortion: principalPortion,
    interestAmount: interestPortion,
    interestPortion: interestPortion,
    unpaidInterest,
    unpaidInterestCarriedForward: unpaidInterest,
    excessPayment,
    remainingBalance: newRemaining,
    remainingPrincipalAfterPayment: newRemaining,
    daysElapsed,
    isStandardCadence: daysElapsed >= 28 && daysElapsed <= 31,
    annualRate: R,
    calculationMethod: method,
    isFullRepayment: newRemaining === 0,
    explanation,
  };
}

module.exports = {
  calculateEmi,
  calculateRepaymentBreakdown,
};
