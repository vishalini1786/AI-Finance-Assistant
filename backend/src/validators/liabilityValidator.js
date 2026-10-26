// liabilityValidator.js
// Validates incoming liability payloads and repayment records.

const VALID_STATUSES = new Set(['ACTIVE', 'PAID_OFF', 'ARCHIVED']);
const VALID_FREQUENCIES = new Set(['MONTHLY', 'QUARTERLY', 'BI_WEEKLY', 'WEEKLY', 'YEARLY', 'ONE_TIME']);

function validateLiabilityBase(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      errors.push('Liability name is required');
    }
  }

  if (!isUpdate || data.liabilityType !== undefined) {
    if (!data.liabilityType || typeof data.liabilityType !== 'string' || !data.liabilityType.trim()) {
      errors.push('Liability type is required');
    }
  }

  const hasTotal = data.totalAmount !== undefined || data.total_amount !== undefined;
  if (!isUpdate || hasTotal) {
    const totalAmount = Number(data.totalAmount ?? data.total_amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      errors.push('Original principal amount must be greater than zero');
    }
  }

  const remainingRaw = data.remainingAmount ?? data.remaining_amount;
  if (remainingRaw !== undefined && remainingRaw !== null && remainingRaw !== '') {
    const remaining = Number(remainingRaw);
    if (isNaN(remaining) || remaining < 0) {
      errors.push('Outstanding balance cannot be negative');
    } else if (hasTotal) {
      const totalAmount = Number(data.totalAmount ?? data.total_amount);
      if (!isNaN(totalAmount) && remaining > totalAmount) {
        errors.push('Outstanding balance cannot exceed original principal amount');
      }
    }
  }

  const rateRaw = data.interestRate ?? data.interest_rate;
  if (rateRaw !== undefined && rateRaw !== null && rateRaw !== '') {
    const rate = Number(rateRaw);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      errors.push('Interest rate must be between 0% and 100%');
    }
  }

  const emiRaw = data.emiAmount ?? data.emi_amount;
  if (emiRaw !== undefined && emiRaw !== null && emiRaw !== '') {
    const emi = Number(emiRaw);
    if (isNaN(emi) || emi < 0) {
      errors.push('EMI / payment amount cannot be negative');
    }
  }

  if (data.status && !VALID_STATUSES.has(String(data.status).toUpperCase())) {
    errors.push('Status must be ACTIVE, PAID_OFF, or ARCHIVED');
  }

  const freq = data.paymentFrequency ?? data.payment_frequency;
  if (freq && !VALID_FREQUENCIES.has(String(freq).toUpperCase())) {
    errors.push('Payment frequency must be MONTHLY, QUARTERLY, BI_WEEKLY, WEEKLY, YEARLY, or ONE_TIME');
  }

  const dueDate = data.dueDate ?? data.due_date;
  if (dueDate && isNaN(Date.parse(dueDate))) {
    errors.push('Due date must be a valid date');
  }

  const startDate = data.startDate ?? data.start_date;
  if (startDate && isNaN(Date.parse(startDate))) {
    errors.push('Start date must be a valid date');
  }

  return errors;
}

function validateLiability(data) {
  return validateLiabilityBase(data, false);
}

function validateLiabilityUpdate(data) {
  return validateLiabilityBase(data, true);
}

function validateRepayment(data) {
  const errors = [];
  const amount = Number(data.amount);
  if (isNaN(amount) || amount <= 0) {
    errors.push('Payment amount must be greater than zero');
  }

  const paymentDate = data.paymentDate ?? data.payment_date;
  if (paymentDate && isNaN(Date.parse(paymentDate))) {
    errors.push('Payment date must be a valid date');
  }

  const principal = data.principalAmount ?? data.principal_amount;
  if (principal !== undefined && principal !== null && principal !== '') {
    const p = Number(principal);
    if (isNaN(p) || p < 0) {
      errors.push('Principal portion cannot be negative');
    }
  }

  const interest = data.interestAmount ?? data.interest_amount;
  if (interest !== undefined && interest !== null && interest !== '') {
    const i = Number(interest);
    if (isNaN(i) || i < 0) {
      errors.push('Interest portion cannot be negative');
    }
  }

  return errors;
}

module.exports = {
  validateLiability,
  validateLiabilityUpdate,
  validateRepayment,
};
