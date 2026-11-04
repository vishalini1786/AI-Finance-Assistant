// liabilityService.js
// Business logic, calculations, and orchestration for liabilities and debt management.

const liabilityRepository = require('../repositories/liabilityRepository');
const aiInsightService = require('./aiInsightService');
const { calculateEmi, calculateRepaymentBreakdown } = require('../utils/loanCalculator');

function notFound(message = 'Liability record not found') {
  const error = new Error(message);
  error.statusCode = 404;
  error.expose = true;
  return error;
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.expose = true;
  return error;
}

function formatLiability(row) {
  if (!row) return null;
  return {
    ...row,
    total_amount: Number(row.total_amount || 0),
    remaining_amount: Number(row.remaining_amount || 0),
    interest_rate: row.interest_rate !== null ? Number(row.interest_rate) : 0,
    emi_amount: Number(row.emi_amount || 0),
    tenure_months: row.tenure_months ? Number(row.tenure_months) : null,
    interest_calculation_method: row.interest_calculation_method || 'REDUCING_BALANCE',
    repayment_method: row.repayment_method || 'EMI',
    first_payment_date: row.first_payment_date || row.due_date || null,
    progress_percentage: row.total_amount > 0
      ? Number((((Number(row.total_amount) - Number(row.remaining_amount)) / Number(row.total_amount)) * 100).toFixed(1))
      : 0,
  };
}

function triggerAsyncInsightRefresh(userId) {
  try {
    if (aiInsightService && typeof aiInsightService.refreshInsightsForUser === 'function') {
      aiInsightService.refreshInsightsForUser(userId, { pageContext: 'ASSETS_LIABILITIES' }).catch((err) => {
        console.warn('[LiabilityService] Background insight refresh error:', err.message);
      });
    }
  } catch (err) {
    // Non-blocking
  }
}

async function getLiabilities(userId, options = {}) {
  const rows = await liabilityRepository.findAllByUser(userId, options);
  return rows.map(formatLiability);
}

async function getLiability(liabilityId, userId) {
  const liability = await liabilityRepository.findByIdAndUser(liabilityId, userId);
  if (!liability) throw notFound();

  const payments = await liabilityRepository.getPayments(liabilityId, userId);
  return {
    ...formatLiability(liability),
    payments: payments.map((p) => ({
      ...p,
      amount: Number(p.amount || 0),
      principal_amount: Number(p.principal_amount || 0),
      interest_amount: Number(p.interest_amount || 0),
      remaining_principal: Number(p.remaining_principal || 0),
      expense_id: p.expense_id || null,
    })),
  };
}

async function createLiability(userId, data) {
  const totalAmount = Number(data.totalAmount ?? data.total_amount);
  const remainingAmount = data.remainingAmount !== undefined && data.remainingAmount !== null && data.remainingAmount !== ''
    ? Number(data.remainingAmount)
    : totalAmount;

  if (remainingAmount > totalAmount) {
    throw badRequest('Outstanding balance cannot exceed original principal amount');
  }

  const interestRate = data.interestRate !== undefined && data.interestRate !== null && data.interestRate !== ''
    ? Number(data.interestRate)
    : 0;
  const tenureMonths = data.tenureMonths !== undefined && data.tenureMonths !== null && data.tenureMonths !== ''
    ? Number(data.tenureMonths)
    : null;
  const paymentFrequency = data.paymentFrequency ?? data.payment_frequency ?? 'MONTHLY';
  const calculationMethod = data.interestCalculationMethod ?? data.interest_calculation_method ?? (interestRate > 0 ? 'REDUCING_BALANCE' : 'ZERO_INTEREST');
  const repaymentMethod = data.repaymentMethod ?? data.repayment_method ?? 'EMI';
  const firstPaymentDate = data.firstPaymentDate ?? data.first_payment_date ?? data.dueDate ?? data.due_date ?? null;

  // Compute EMI automatically if not explicitly provided by user
  let emiAmount = data.emiAmount !== undefined && data.emiAmount !== null && data.emiAmount !== ''
    ? Number(data.emiAmount)
    : 0;

  if ((!emiAmount || emiAmount <= 0) && tenureMonths && tenureMonths > 0) {
    emiAmount = calculateEmi({
      principal: totalAmount,
      annualRate: interestRate,
      tenureMonths,
      frequency: paymentFrequency,
      calculationMethod,
    });
  }

  const created = await liabilityRepository.create({
    userId,
    liabilityType: data.liabilityType ?? data.liability_type,
    name: data.name,
    totalAmount,
    remainingAmount,
    interestRate,
    dueDate: data.dueDate ?? data.due_date ?? firstPaymentDate ?? null,
    lender: data.lender ?? null,
    emiAmount,
    paymentFrequency,
    startDate: data.startDate ?? data.start_date ?? null,
    tenureMonths,
    status: data.status ?? 'ACTIVE',
    notes: data.notes ?? null,
    interestCalculationMethod: calculationMethod,
    repaymentMethod,
    firstPaymentDate,
  });

  triggerAsyncInsightRefresh(userId);
  return formatLiability(created);
}

async function updateLiability(liabilityId, userId, data) {
  const existing = await liabilityRepository.findByIdAndUser(liabilityId, userId);
  if (!existing) throw notFound();

  const totalAmount = data.totalAmount !== undefined
    ? Number(data.totalAmount)
    : Number(existing.total_amount);

  let remainingAmount = data.remainingAmount !== undefined
    ? Number(data.remainingAmount)
    : Number(existing.remaining_amount);

  if (remainingAmount > totalAmount) {
    throw badRequest('Outstanding balance cannot exceed original principal amount');
  }

  const interestRate = data.interestRate !== undefined ? Number(data.interestRate) : undefined;
  const tenureMonths = data.tenureMonths !== undefined ? (data.tenureMonths ? Number(data.tenureMonths) : null) : undefined;
  const paymentFrequency = data.paymentFrequency ?? data.payment_frequency;
  const calculationMethod = data.interestCalculationMethod ?? data.interest_calculation_method;

  let emiAmount = data.emiAmount !== undefined ? Number(data.emiAmount) : undefined;
  if ((emiAmount === undefined || emiAmount === 0) && tenureMonths && tenureMonths > 0 && interestRate !== undefined) {
    emiAmount = calculateEmi({
      principal: totalAmount,
      annualRate: interestRate,
      tenureMonths,
      frequency: paymentFrequency || existing.payment_frequency,
      calculationMethod: calculationMethod || existing.interest_calculation_method,
    });
  }

  const updated = await liabilityRepository.update(liabilityId, userId, {
    liabilityType: data.liabilityType ?? data.liability_type,
    name: data.name,
    totalAmount,
    remainingAmount,
    interestRate,
    dueDate: data.dueDate !== undefined ? data.dueDate : undefined,
    lender: data.lender !== undefined ? data.lender : undefined,
    emiAmount,
    paymentFrequency,
    startDate: data.startDate !== undefined ? data.startDate : undefined,
    tenureMonths,
    status: data.status,
    notes: data.notes !== undefined ? data.notes : undefined,
    interestCalculationMethod: calculationMethod,
    repaymentMethod: data.repaymentMethod ?? data.repayment_method,
    firstPaymentDate: data.firstPaymentDate ?? data.first_payment_date,
  });

  if (!updated) throw notFound();

  triggerAsyncInsightRefresh(userId);
  return formatLiability(updated);
}

async function deleteLiability(liabilityId, userId) {
  const removed = await liabilityRepository.remove(liabilityId, userId);
  if (!removed) throw notFound();

  triggerAsyncInsightRefresh(userId);
  return { success: true, message: 'Liability deleted successfully' };
}

async function archiveLiability(liabilityId, userId) {
  const archived = await liabilityRepository.archive(liabilityId, userId);
  if (!archived) throw notFound();

  triggerAsyncInsightRefresh(userId);
  return formatLiability(archived);
}

async function calculateRepayment(liabilityId, userId, { amount, paymentDate } = {}) {
  const liability = await liabilityRepository.findByIdAndUser(liabilityId, userId);
  if (!liability) throw notFound();

  const payments = await liabilityRepository.getPayments(liabilityId, userId);
  const lastPayment = payments[0] || null;

  const paymentAmount = amount !== undefined && amount !== null && amount !== ''
    ? Number(amount)
    : Number(liability.emi_amount || liability.remaining_amount || 0);

  const breakdown = calculateRepaymentBreakdown({
    outstandingPrincipal: Number(liability.remaining_amount),
    annualRate: Number(liability.interest_rate || 0),
    paymentAmount,
    paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
    lastPaymentDate: lastPayment ? lastPayment.payment_date : null,
    startDate: liability.start_date,
    dueDate: liability.due_date,
    frequency: liability.payment_frequency,
    calculationMethod: liability.interest_calculation_method || 'REDUCING_BALANCE',
  });

  return {
    liabilityId: Number(liabilityId),
    liabilityName: liability.name,
    lender: liability.lender,
    outstandingPrincipal: Number(liability.remaining_amount),
    annualRate: Number(liability.interest_rate || 0),
    paymentFrequency: liability.payment_frequency,
    calculationMethod: liability.interest_calculation_method || 'REDUCING_BALANCE',
    lastPaymentDate: lastPayment ? lastPayment.payment_date : null,
    breakdown,
    ...breakdown,
  };
}

async function recordPayment(liabilityId, userId, data) {
  const existing = await liabilityRepository.findByIdAndUser(liabilityId, userId);
  if (!existing) throw notFound();

  const paymentAmount = Number(data.amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw badRequest('Payment amount must be greater than zero');
  }

  const remaining = Number(existing.remaining_amount);
  if (remaining <= 0 || existing.status === 'PAID_OFF') {
    throw badRequest('This loan is already fully repaid');
  }

  const result = await liabilityRepository.recordPayment({
    liabilityId,
    userId,
    amount: paymentAmount,
    principalAmount: data.principalAmount !== undefined ? Number(data.principalAmount) : null,
    interestAmount: data.interestAmount !== undefined ? Number(data.interestAmount) : null,
    paymentDate: data.paymentDate || null,
    paymentMode: data.paymentMode || 'BANK_TRANSFER',
    notes: data.notes || null,
  });

  triggerAsyncInsightRefresh(userId);

  return {
    payment: {
      ...result.payment,
      amount: Number(result.payment.amount),
      principal_amount: Number(result.payment.principal_amount),
      interest_amount: Number(result.payment.interest_amount),
      remaining_principal: Number(result.payment.remaining_principal || 0),
      expense_id: result.payment.expense_id || null,
    },
    liability: formatLiability(result.liability),
    calculation: result.calculation,
  };
}

async function getSummary(userId) {
  return liabilityRepository.getSummary(userId);
}

module.exports = {
  getLiabilities,
  getLiability,
  createLiability,
  updateLiability,
  deleteLiability,
  archiveLiability,
  calculateRepayment,
  recordPayment,
  getSummary,
};
