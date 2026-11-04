// liabilityRepository.js
// Handles all PostgreSQL database queries for liabilities and repayments.

const db = require('../config/database');
const { calculateRepaymentBreakdown } = require('../utils/loanCalculator');

const SELECT_LIABILITY_FIELDS = `
  liability_id,
  user_id,
  liability_type,
  name,
  total_amount,
  remaining_amount,
  interest_rate,
  TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date,
  lender,
  emi_amount,
  payment_frequency,
  TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
  tenure_months,
  status,
  notes,
  interest_calculation_method,
  repayment_method,
  TO_CHAR(first_payment_date, 'YYYY-MM-DD') AS first_payment_date,
  created_at,
  updated_at
`;

async function findAllByUser(userId, { status, liabilityType, search, sortBy = 'due_date', sortOrder = 'ASC' } = {}) {
  const values = [userId];
  const conditions = ['user_id = $1'];

  if (status && status !== 'ALL') {
    values.push(status.toUpperCase());
    conditions.push(`status = $${values.length}`);
  }

  if (liabilityType && liabilityType !== 'ALL') {
    values.push(liabilityType.toUpperCase());
    conditions.push(`liability_type = $${values.length}`);
  }

  if (search && search.trim()) {
    values.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(name) LIKE $${values.length} OR LOWER(COALESCE(lender, '')) LIKE $${values.length})`);
  }

  let orderClause = 'ORDER BY ';
  const orderDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  switch (sortBy) {
    case 'remaining_amount':
    case 'balance':
      orderClause += `remaining_amount ${orderDirection}, liability_id DESC`;
      break;
    case 'total_amount':
      orderClause += `total_amount ${orderDirection}, liability_id DESC`;
      break;
    case 'name':
      orderClause += `name ${orderDirection}, liability_id DESC`;
      break;
    case 'interest_rate':
      orderClause += `interest_rate ${orderDirection} NULLS LAST, liability_id DESC`;
      break;
    case 'created_at':
      orderClause += `created_at ${orderDirection}`;
      break;
    case 'due_date':
    default:
      orderClause += `due_date ${orderDirection} NULLS LAST, remaining_amount DESC`;
      break;
  }

  const query = `
    SELECT ${SELECT_LIABILITY_FIELDS}
    FROM liabilities
    WHERE ${conditions.join(' AND ')}
    ${orderClause}
  `;

  const result = await db.query(query, values);
  return result.rows;
}

async function findByIdAndUser(liabilityId, userId) {
  const result = await db.query(
    `SELECT ${SELECT_LIABILITY_FIELDS}
     FROM liabilities
     WHERE liability_id = $1 AND user_id = $2`,
    [liabilityId, userId]
  );
  return result.rows[0] || null;
}

async function create({
  userId,
  liabilityType,
  name,
  totalAmount,
  remainingAmount,
  interestRate = 0,
  dueDate = null,
  lender = null,
  emiAmount = 0,
  paymentFrequency = 'MONTHLY',
  startDate = null,
  tenureMonths = null,
  status = 'ACTIVE',
  notes = null,
  interestCalculationMethod = 'REDUCING_BALANCE',
  repaymentMethod = 'EMI',
  firstPaymentDate = null,
}) {
  const finalRemaining = remainingAmount !== undefined && remainingAmount !== null
    ? remainingAmount
    : totalAmount;

  const result = await db.query(
    `INSERT INTO liabilities (
       user_id, liability_type, name, total_amount, remaining_amount,
       interest_rate, due_date, lender, emi_amount, payment_frequency,
       start_date, tenure_months, status, notes,
       interest_calculation_method, repayment_method, first_payment_date
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING ${SELECT_LIABILITY_FIELDS}`,
    [
      userId,
      liabilityType.toUpperCase(),
      name.trim(),
      totalAmount,
      finalRemaining,
      interestRate ?? 0,
      dueDate || null,
      lender ? lender.trim() : null,
      emiAmount ?? 0,
      paymentFrequency ? paymentFrequency.toUpperCase() : 'MONTHLY',
      startDate || null,
      tenureMonths ?? null,
      status ? status.toUpperCase() : 'ACTIVE',
      notes ? notes.trim() : null,
      interestCalculationMethod ? interestCalculationMethod.toUpperCase() : 'REDUCING_BALANCE',
      repaymentMethod || 'EMI',
      firstPaymentDate || null,
    ]
  );
  return result.rows[0];
}

async function update(liabilityId, userId, fields) {
  const existing = await findByIdAndUser(liabilityId, userId);
  if (!existing) return null;

  const totalAmount = fields.totalAmount !== undefined ? fields.totalAmount : existing.total_amount;
  let remainingAmount = fields.remainingAmount !== undefined ? fields.remainingAmount : existing.remaining_amount;

  // Auto-update status if balance hits 0
  let status = fields.status ? fields.status.toUpperCase() : existing.status;
  if (Number(remainingAmount) <= 0 && status === 'ACTIVE') {
    status = 'PAID_OFF';
    remainingAmount = 0;
  }

  const result = await db.query(
    `UPDATE liabilities
     SET liability_type = COALESCE($1, liability_type),
         name = COALESCE($2, name),
         total_amount = $3,
         remaining_amount = $4,
         interest_rate = COALESCE($5, interest_rate),
         due_date = CASE WHEN $6::boolean THEN $7::date ELSE due_date END,
         lender = CASE WHEN $8::boolean THEN $9 ELSE lender END,
         emi_amount = COALESCE($10, emi_amount),
         payment_frequency = COALESCE($11, payment_frequency),
         start_date = CASE WHEN $12::boolean THEN $13::date ELSE start_date END,
         tenure_months = CASE WHEN $14::boolean THEN $15::int ELSE tenure_months END,
         status = $16,
         notes = CASE WHEN $17::boolean THEN $18 ELSE notes END,
         interest_calculation_method = COALESCE($19, interest_calculation_method),
         repayment_method = COALESCE($20, repayment_method),
         first_payment_date = CASE WHEN $21::boolean THEN $22::date ELSE first_payment_date END,
         updated_at = NOW()
     WHERE liability_id = $23 AND user_id = $24
     RETURNING ${SELECT_LIABILITY_FIELDS}`,
    [
      fields.liabilityType ? fields.liabilityType.toUpperCase() : null,
      fields.name ? fields.name.trim() : null,
      totalAmount,
      remainingAmount,
      fields.interestRate !== undefined ? fields.interestRate : null,
      fields.dueDate !== undefined,
      fields.dueDate || null,
      fields.lender !== undefined,
      fields.lender ? fields.lender.trim() : null,
      fields.emiAmount !== undefined ? fields.emiAmount : null,
      fields.paymentFrequency ? fields.paymentFrequency.toUpperCase() : null,
      fields.startDate !== undefined,
      fields.startDate || null,
      fields.tenureMonths !== undefined,
      fields.tenureMonths ?? null,
      status,
      fields.notes !== undefined,
      fields.notes ? fields.notes.trim() : null,
      fields.interestCalculationMethod ? fields.interestCalculationMethod.toUpperCase() : null,
      fields.repaymentMethod || null,
      fields.firstPaymentDate !== undefined,
      fields.firstPaymentDate || null,
      liabilityId,
      userId,
    ]
  );

  return result.rows[0] || null;
}

async function remove(liabilityId, userId) {
  const result = await db.query(
    'DELETE FROM liabilities WHERE liability_id = $1 AND user_id = $2 RETURNING liability_id',
    [liabilityId, userId]
  );
  return result.rowCount > 0;
}

async function archive(liabilityId, userId) {
  const result = await db.query(
    `UPDATE liabilities
     SET status = 'ARCHIVED', updated_at = NOW()
     WHERE liability_id = $1 AND user_id = $2
     RETURNING ${SELECT_LIABILITY_FIELDS}`,
    [liabilityId, userId]
  );
  return result.rows[0] || null;
}

async function getPayments(liabilityId, userId) {
  const result = await db.query(
    `SELECT payment_id, liability_id, user_id, amount, principal_amount, interest_amount,
            remaining_principal, expense_id,
            TO_CHAR(payment_date, 'YYYY-MM-DD') AS payment_date,
            payment_mode, notes, created_at
     FROM liability_payments
     WHERE liability_id = $1 AND user_id = $2
     ORDER BY payment_date DESC, payment_id DESC`,
    [liabilityId, userId]
  );
  return result.rows;
}

/**
 * Record a payment against a liability atomically:
 * 1. Locks the liability row for update.
 * 2. Checks loan status (fully repaid loans reject payments).
 * 3. Prevents duplicate submissions within 5 seconds.
 * 4. Calculates exact principal/interest split via loanCalculator.
 * 5. Records interest portion as an expense exactly once (in expenses table).
 * 6. Inserts into liability_payments with remaining_principal and expense_id.
 * 7. Deducts principal portion from liability remaining_amount.
 * 8. Advances due_date on liability and active recurring commitments.
 */
async function recordPayment({
  liabilityId,
  userId,
  amount,
  principalAmount,
  interestAmount,
  paymentDate,
  paymentMode = 'BANK_TRANSFER',
  notes = null,
}) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock liability row for update to ensure concurrency safety
    const liabRes = await client.query(
      `SELECT *,
              TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
              TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date,
              TO_CHAR(first_payment_date, 'YYYY-MM-DD') AS first_payment_date
       FROM liabilities
       WHERE liability_id = $1 AND user_id = $2
       FOR UPDATE`,
      [liabilityId, userId]
    );

    if (liabRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const liab = liabRes.rows[0];
    const totalPayment = Number(amount);
    const remainingBefore = Number(liab.remaining_amount);

    // Reject payment if already fully repaid
    if (liab.status === 'PAID_OFF' || remainingBefore <= 0) {
      const err = new Error('This loan is already fully repaid. No further payments can be recorded.');
      err.statusCode = 400;
      err.expose = true;
      throw err;
    }

    const effectivePaymentDate = paymentDate || new Date().toISOString().slice(0, 10);

    // Prevent duplicate repayment submissions within 5 seconds
    const dupCheck = await client.query(
      `SELECT payment_id FROM liability_payments
       WHERE liability_id = $1 AND user_id = $2 AND amount = $3 AND payment_date = $4::date
         AND created_at >= NOW() - INTERVAL '5 seconds'`,
      [liabilityId, userId, totalPayment, effectivePaymentDate]
    );
    if (dupCheck.rows.length > 0) {
      const err = new Error('Duplicate repayment detected. This payment was already recorded.');
      err.statusCode = 409;
      err.expose = true;
      throw err;
    }

    // 2. Fetch latest prior payment date to compute accrued interest for the period
    const lastPayRes = await client.query(
      `SELECT TO_CHAR(payment_date, 'YYYY-MM-DD') AS payment_date
       FROM liability_payments
       WHERE liability_id = $1 AND user_id = $2
       ORDER BY payment_date DESC, payment_id DESC
       LIMIT 1`,
      [liabilityId, userId]
    );
    const lastPaymentDate = lastPayRes.rows[0]?.payment_date || null;

    // 3. Compute principal and interest split dynamically
    const breakdown = calculateRepaymentBreakdown({
      outstandingPrincipal: remainingBefore,
      annualRate: Number(liab.interest_rate || 0),
      paymentAmount: totalPayment,
      paymentDate: effectivePaymentDate,
      lastPaymentDate,
      startDate: liab.start_date,
      dueDate: liab.due_date,
      frequency: liab.payment_frequency,
      calculationMethod: liab.interest_calculation_method || 'REDUCING_BALANCE',
    });

    let principalPart = principalAmount !== undefined && principalAmount !== null && principalAmount !== ''
      ? Number(principalAmount)
      : breakdown.principalAmount;
    let interestPart = interestAmount !== undefined && interestAmount !== null && interestAmount !== ''
      ? Number(interestAmount)
      : breakdown.interestAmount;

    // Ensure principal part cannot exceed remaining balance
    if (principalPart > remainingBefore) {
      principalPart = remainingBefore;
      interestPart = Math.max(0, Number((totalPayment - principalPart).toFixed(2)));
    }

    const calculatedRemaining = Number((remainingBefore - principalPart).toFixed(2));
    const newRemaining = calculatedRemaining <= 0.001 ? 0 : calculatedRemaining;
    const newStatus = newRemaining === 0 ? 'PAID_OFF' : liab.status;

    // 4. Record interest expense exactly once in expenses table (if interestPart > 0)
    let linkedExpenseId = null;
    if (interestPart > 0) {
      // Find 'Bills' category (or 'Interest')
      const catRes = await client.query(
        `SELECT category_id FROM categories
         WHERE (user_id IS NULL OR user_id = $1)
           AND LOWER(TRIM(name)) IN ('bills', 'interest', 'others')
         ORDER BY (LOWER(TRIM(name)) = 'bills') DESC, category_id ASC
         LIMIT 1`,
        [userId]
      );
      const categoryId = catRes.rows[0]?.category_id || 7;

      const expRes = await client.query(
        `INSERT INTO expenses (
           user_id, category_id, amount, expense_date, merchant_name, payment_mode, description, source_type
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'MANUAL')
         RETURNING expense_id`,
        [
          userId,
          categoryId,
          interestPart,
          effectivePaymentDate,
          liab.lender || liab.name,
          paymentMode || 'BANK_TRANSFER',
          `Loan Interest - ${liab.name} (${breakdown.daysElapsed} days @ ${liab.interest_rate}%)`,
        ]
      );
      linkedExpenseId = expRes.rows[0]?.expense_id || null;
    }

    // 5. Advance due date if loan remains active and due_date exists
    let newDueDate = liab.due_date;
    if (newRemaining > 0 && liab.due_date) {
      const freq = (liab.payment_frequency || 'MONTHLY').toUpperCase();
      let interval = '1 month';
      if (freq === 'QUARTERLY') interval = '3 months';
      else if (freq === 'BI_WEEKLY') interval = '2 weeks';
      else if (freq === 'WEEKLY') interval = '1 week';
      else if (freq === 'YEARLY') interval = '1 year';

      const nextDueRes = await client.query(
        `SELECT (due_date + INTERVAL '${interval}')::date AS next_due FROM liabilities WHERE liability_id = $1`,
        [liabilityId]
      );
      if (nextDueRes.rows[0]?.next_due) {
        newDueDate = nextDueRes.rows[0].next_due;
      }
    }

    // 6. Insert into liability_payments
    const payRes = await client.query(
      `INSERT INTO liability_payments (
         liability_id, user_id, amount, principal_amount, interest_amount,
         remaining_principal, expense_id, payment_date, payment_mode, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING payment_id, liability_id, user_id, amount, principal_amount, interest_amount,
                 remaining_principal, expense_id,
                 TO_CHAR(payment_date, 'YYYY-MM-DD') AS payment_date, payment_mode, notes, created_at`,
      [
        liabilityId,
        userId,
        totalPayment,
        principalPart,
        interestPart,
        newRemaining,
        linkedExpenseId,
        effectivePaymentDate,
        paymentMode,
        notes ? notes.trim() : null,
      ]
    );

    // 7. Update liability record
    const updatedLiabRes = await client.query(
      `UPDATE liabilities
       SET remaining_amount = $1,
           status = $2,
           due_date = $3,
           updated_at = NOW()
       WHERE liability_id = $4 AND user_id = $5
       RETURNING ${SELECT_LIABILITY_FIELDS}`,
      [newRemaining, newStatus, newDueDate, liabilityId, userId]
    );

    // 8. If an active recurring payment exists for this loan/EMI, advance its next_due_date as well
    if (newDueDate) {
      await client.query(
        `UPDATE recurring_payments
         SET next_due_date = $1, updated_at = NOW()
         WHERE user_id = $2 AND is_active = TRUE
           AND (LOWER(name) LIKE $3 OR LOWER(name) LIKE $4)`,
        [
          newDueDate,
          userId,
          `%${liab.name.toLowerCase().trim()}%`,
          `%${(liab.lender || '').toLowerCase().trim()}%`,
        ]
      );
    }

    await client.query('COMMIT');

    return {
      payment: payRes.rows[0],
      liability: updatedLiabRes.rows[0],
      calculation: breakdown,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getSummary(userId) {
  // Aggregate totals from database
  const result = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN remaining_amount ELSE 0 END), 0) AS total_liabilities,
       COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN total_amount ELSE 0 END), 0) AS total_original_principal,
       COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) AS active_count,
       COUNT(CASE WHEN status = 'PAID_OFF' THEN 1 END) AS paid_off_count,
       COUNT(CASE WHEN status = 'ARCHIVED' THEN 1 END) AS archived_count,
       COALESCE(SUM(
         CASE
           WHEN status = 'ACTIVE' THEN
             CASE
               WHEN payment_frequency = 'QUARTERLY' THEN emi_amount / 3.0
               WHEN payment_frequency = 'YEARLY' THEN emi_amount / 12.0
               WHEN payment_frequency = 'BI_WEEKLY' THEN emi_amount * 2.166
               WHEN payment_frequency = 'WEEKLY' THEN emi_amount * 4.333
               ELSE emi_amount
             END
           ELSE 0
         END
       ), 0) AS total_monthly_emi
     FROM liabilities
     WHERE user_id = $1`,
    [userId]
  );

  // Next upcoming payment
  const upcomingRes = await db.query(
    `SELECT liability_id, name, lender, liability_type, emi_amount, remaining_amount,
            TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date
     FROM liabilities
     WHERE user_id = $1
       AND status = 'ACTIVE'
       AND due_date IS NOT NULL
       AND due_date >= CURRENT_DATE
     ORDER BY due_date ASC
     LIMIT 1`,
    [userId]
  );

  // Payment totals across history
  const paymentHistoryRes = await db.query(
    `SELECT
       COALESCE(SUM(amount), 0) AS total_repaid,
       COALESCE(SUM(principal_amount), 0) AS total_principal_repaid,
       COALESCE(SUM(interest_amount), 0) AS total_interest_paid
     FROM liability_payments
     WHERE user_id = $1`,
    [userId]
  );

  const row = result.rows[0] || {};
  const payRow = paymentHistoryRes.rows[0] || {};
  const upcoming = upcomingRes.rows[0] || null;

  return {
    totalLiabilities: Number(row.total_liabilities || 0),
    totalOriginalPrincipal: Number(row.total_original_principal || 0),
    activeCount: Number(row.active_count || 0),
    paidOffCount: Number(row.paid_off_count || 0),
    archivedCount: Number(row.archived_count || 0),
    totalMonthlyEmi: Number(Number(row.total_monthly_emi || 0).toFixed(2)),
    totalRepaid: Number(payRow.total_repaid || 0),
    totalPrincipalRepaid: Number(payRow.total_principal_repaid || 0),
    totalInterestPaid: Number(payRow.total_interest_paid || 0),
    upcomingPayment: upcoming
      ? {
          liabilityId: upcoming.liability_id,
          name: upcoming.name,
          lender: upcoming.lender,
          liabilityType: upcoming.liability_type,
          amount: Number(upcoming.emi_amount || upcoming.remaining_amount || 0),
          dueDate: upcoming.due_date,
        }
      : null,
  };
}

module.exports = {
  findAllByUser,
  findByIdAndUser,
  create,
  update,
  remove,
  archive,
  getPayments,
  recordPayment,
  getSummary,
};
