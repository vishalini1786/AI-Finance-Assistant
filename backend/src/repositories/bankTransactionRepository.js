// bankTransactionRepository.js
// Handles all PostgreSQL database queries for bank import batches and bank transactions.

const db = require('../config/database');

const SELECT_BANK_TX_FIELDS = `
  bt.bank_tx_id,
  bt.user_id,
  bt.batch_id,
  TO_CHAR(bt.transaction_date, 'YYYY-MM-DD') AS transaction_date,
  bt.description,
  bt.amount,
  bt.direction,
  bt.reference_no,
  bt.source_account,
  bt.category_id,
  c.name AS category_name,
  bt.status,
  bt.linked_expense_id,
  bt.linked_income_id,
  bt.match_notes,
  bt.created_at,
  bt.updated_at,
  b.filename AS batch_filename
`;

async function createBatch({ userId, filename, fileFormat, totalRows = 0, importedCount = 0, skippedCount = 0 }) {
  const result = await db.query(
    `INSERT INTO bank_import_batches (user_id, filename, file_format, total_rows, imported_count, skipped_count)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING batch_id, user_id, filename, file_format, total_rows, imported_count, skipped_count, created_at`,
    [userId, filename, fileFormat.toUpperCase(), totalRows, importedCount, skippedCount]
  );
  return result.rows[0];
}

async function getBatchesByUser(userId) {
  const result = await db.query(
    `SELECT batch_id, user_id, filename, file_format, total_rows, imported_count, skipped_count, created_at
     FROM bank_import_batches
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getBatchById(batchId, userId) {
  const result = await db.query(
    `SELECT batch_id, user_id, filename, file_format, total_rows, imported_count, skipped_count, created_at
     FROM bank_import_batches
     WHERE batch_id = $1 AND user_id = $2`,
    [batchId, userId]
  );
  return result.rows[0] || null;
}

async function createTransactionsBulk(userId, batchId, items) {
  if (!items || items.length === 0) return [];

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = [];

    for (const item of items) {
      const res = await client.query(
        `INSERT INTO bank_transactions (
           user_id, batch_id, transaction_date, description, amount,
           direction, reference_no, source_account, category_id, status, match_notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING bank_tx_id, user_id, batch_id, TO_CHAR(transaction_date, 'YYYY-MM-DD') AS transaction_date,
                   description, amount, direction, reference_no, source_account, category_id, status, created_at`,
        [
          userId,
          batchId,
          item.transactionDate,
          item.description.trim(),
          item.amount,
          item.direction.toUpperCase(),
          item.referenceNo ? item.referenceNo.trim() : null,
          item.sourceAccount ? item.sourceAccount.trim() : null,
          item.categoryId || null,
          item.status || 'UNMATCHED',
          item.matchNotes || null,
        ]
      );
      inserted.push(res.rows[0]);
    }

    await client.query('COMMIT');
    return inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function findTransactionsByUser(userId, {
  status,
  direction,
  batchId,
  startDate,
  endDate,
  search,
  limit = 50,
  offset = 0,
  sortBy = 'transaction_date',
  sortOrder = 'DESC',
} = {}) {
  const values = [userId];
  const conditions = ['bt.user_id = $1'];

  if (status && status !== 'ALL') {
    values.push(status.toUpperCase());
    conditions.push(`bt.status = $${values.length}`);
  }

  if (direction && direction !== 'ALL') {
    values.push(direction.toUpperCase());
    conditions.push(`bt.direction = $${values.length}`);
  }

  if (batchId) {
    values.push(batchId);
    conditions.push(`bt.batch_id = $${values.length}`);
  }

  if (startDate) {
    values.push(startDate);
    conditions.push(`bt.transaction_date >= $${values.length}::date`);
  }

  if (endDate) {
    values.push(endDate);
    conditions.push(`bt.transaction_date <= $${values.length}::date`);
  }

  if (search && search.trim()) {
    values.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(bt.description) LIKE $${values.length} OR LOWER(COALESCE(bt.reference_no, '')) LIKE $${values.length})`);
  }

  const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  let orderColumn = 'bt.transaction_date';
  if (sortBy === 'amount') orderColumn = 'bt.amount';
  if (sortBy === 'description') orderColumn = 'bt.description';
  if (sortBy === 'created_at') orderColumn = 'bt.created_at';

  values.push(limit);
  const limitIdx = values.length;
  values.push(offset);
  const offsetIdx = values.length;

  const query = `
    SELECT ${SELECT_BANK_TX_FIELDS}
    FROM bank_transactions bt
    LEFT JOIN categories c ON c.category_id = bt.category_id
    LEFT JOIN bank_import_batches b ON b.batch_id = bt.batch_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderColumn} ${orderDir}, bt.bank_tx_id DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const result = await db.query(query, values);
  return result.rows;
}

async function countTransactionsByUser(userId, {
  status,
  direction,
  batchId,
  startDate,
  endDate,
  search,
} = {}) {
  const values = [userId];
  const conditions = ['user_id = $1'];

  if (status && status !== 'ALL') {
    values.push(status.toUpperCase());
    conditions.push(`status = $${values.length}`);
  }

  if (direction && direction !== 'ALL') {
    values.push(direction.toUpperCase());
    conditions.push(`direction = $${values.length}`);
  }

  if (batchId) {
    values.push(batchId);
    conditions.push(`batch_id = $${values.length}`);
  }

  if (startDate) {
    values.push(startDate);
    conditions.push(`transaction_date >= $${values.length}::date`);
  }

  if (endDate) {
    values.push(endDate);
    conditions.push(`transaction_date <= $${values.length}::date`);
  }

  if (search && search.trim()) {
    values.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(description) LIKE $${values.length} OR LOWER(COALESCE(reference_no, '')) LIKE $${values.length})`);
  }

  const result = await db.query(
    `SELECT COUNT(*) AS total FROM bank_transactions WHERE ${conditions.join(' AND ')}`,
    values
  );
  return parseInt(result.rows[0].total, 10);
}

async function getSummary(userId) {
  const result = await db.query(
    `SELECT
       COUNT(*) AS total_transactions,
       COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) AS total_debits,
       COUNT(CASE WHEN direction = 'DEBIT' THEN 1 END) AS debit_count,
       COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0) AS total_credits,
       COUNT(CASE WHEN direction = 'CREDIT' THEN 1 END) AS credit_count,
       COUNT(CASE WHEN status = 'UNMATCHED' THEN 1 END) AS pending_review_count,
       COUNT(CASE WHEN status = 'MATCHED' THEN 1 END) AS matched_count,
       COUNT(CASE WHEN status = 'POSTED' THEN 1 END) AS posted_count,
       COUNT(CASE WHEN status = 'EXCLUDED' THEN 1 END) AS excluded_count
     FROM bank_transactions
     WHERE user_id = $1`,
    [userId]
  );

  const row = result.rows[0] || {};
  return {
    totalTransactions: parseInt(row.total_transactions || '0', 10),
    totalDebits: Number(row.total_debits || 0),
    debitCount: parseInt(row.debit_count || '0', 10),
    totalCredits: Number(row.total_credits || 0),
    creditCount: parseInt(row.credit_count || '0', 10),
    pendingReviewCount: parseInt(row.pending_review_count || '0', 10),
    matchedCount: parseInt(row.matched_count || '0', 10),
    postedCount: parseInt(row.posted_count || '0', 10),
    excludedCount: parseInt(row.excluded_count || '0', 10),
  };
}

async function findByIdAndUser(bankTxId, userId) {
  const result = await db.query(
    `SELECT ${SELECT_BANK_TX_FIELDS}
     FROM bank_transactions bt
     LEFT JOIN categories c ON c.category_id = bt.category_id
     LEFT JOIN bank_import_batches b ON b.batch_id = bt.batch_id
     WHERE bt.bank_tx_id = $1 AND bt.user_id = $2`,
    [bankTxId, userId]
  );
  return result.rows[0] || null;
}

/**
 * Searches existing imported bank transactions to detect duplicates before committing.
 */
async function findExistingByReferenceOrSignature(userId, { referenceNo, transactionDate, amount, description }) {
  if (referenceNo) {
    const resRef = await db.query(
      `SELECT bank_tx_id, transaction_date, description, amount, direction, reference_no, status
       FROM bank_transactions
       WHERE user_id = $1 AND LOWER(reference_no) = LOWER($2)
       LIMIT 1`,
      [userId, referenceNo.trim()]
    );
    if (resRef.rows.length > 0) {
      return {
        matchedBy: 'REFERENCE_NO',
        existing: resRef.rows[0],
      };
    }
  }

  // Check same date + exact amount + similar description
  if (transactionDate && amount) {
    const resSig = await db.query(
      `SELECT bank_tx_id, transaction_date, description, amount, direction, reference_no, status
       FROM bank_transactions
       WHERE user_id = $1
         AND transaction_date = $2::date
         AND amount = $3
         AND LOWER(TRIM(description)) = LOWER(TRIM($4))
       LIMIT 1`,
      [userId, transactionDate, amount, description]
    );
    if (resSig.rows.length > 0) {
      return {
        matchedBy: 'SIGNATURE',
        existing: resSig.rows[0],
      };
    }
  }

  return null;
}

/**
 * Searches FinMan expenses (for debits) or incomes (for credits) to suggest reconciliation matches.
 */
async function findPossibleFinmanMatches(userId, { transactionDate, amount, direction, description }) {
  const numAmt = Number(amount);
  if (isNaN(numAmt) || numAmt <= 0) return [];

  const matches = [];

  if (direction === 'DEBIT') {
    // Search in expenses table: date window +/- 3 days, exact amount or close
    const res = await db.query(
      `SELECT e.expense_id AS id, e.amount, TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS date,
              e.description, c.name AS category_name, 'EXPENSE' AS match_type
       FROM expenses e
       LEFT JOIN categories c ON c.category_id = e.category_id
       WHERE e.user_id = $1
         AND e.amount = $2
         AND e.expense_date BETWEEN ($3::date - INTERVAL '3 days') AND ($3::date + INTERVAL '3 days')
       ORDER BY ABS(e.expense_date - $3::date) ASC
       LIMIT 5`,
      [userId, numAmt, transactionDate]
    );
    return res.rows;
  } else if (direction === 'CREDIT') {
    // Search in incomes table
    const res = await db.query(
      `SELECT i.income_id AS id, i.amount, TO_CHAR(i.income_date, 'YYYY-MM-DD') AS date,
              i.description, i.source, 'INCOME' AS match_type
       FROM incomes i
       WHERE i.user_id = $1
         AND i.amount = $2
         AND i.income_date BETWEEN ($3::date - INTERVAL '3 days') AND ($3::date + INTERVAL '3 days')
       ORDER BY ABS(i.income_date - $3::date) ASC
       LIMIT 5`,
      [userId, numAmt, transactionDate]
    );
    return res.rows;
  }

  return matches;
}

async function matchTransaction(bankTxId, userId, { linkedExpenseId, linkedIncomeId, matchNotes }) {
  const result = await db.query(
    `UPDATE bank_transactions
     SET status = 'MATCHED',
         linked_expense_id = $1,
         linked_income_id = $2,
         match_notes = $3,
         updated_at = NOW()
     WHERE bank_tx_id = $4 AND user_id = $5
     RETURNING bank_tx_id, user_id, status, linked_expense_id, linked_income_id, match_notes, updated_at`,
    [linkedExpenseId || null, linkedIncomeId || null, matchNotes ? matchNotes.trim() : null, bankTxId, userId]
  );
  return result.rows[0] || null;
}

async function postToLedger(bankTxId, userId, { linkedExpenseId, linkedIncomeId, categoryId }) {
  const result = await db.query(
    `UPDATE bank_transactions
     SET status = 'POSTED',
         linked_expense_id = COALESCE($1, linked_expense_id),
         linked_income_id = COALESCE($2, linked_income_id),
         category_id = COALESCE($3, category_id),
         updated_at = NOW()
     WHERE bank_tx_id = $4 AND user_id = $5
     RETURNING bank_tx_id, user_id, status, linked_expense_id, linked_income_id, category_id, updated_at`,
    [linkedExpenseId || null, linkedIncomeId || null, categoryId || null, bankTxId, userId]
  );
  return result.rows[0] || null;
}

async function excludeTransaction(bankTxId, userId) {
  const result = await db.query(
    `UPDATE bank_transactions
     SET status = 'EXCLUDED',
         updated_at = NOW()
     WHERE bank_tx_id = $1 AND user_id = $2
     RETURNING bank_tx_id, user_id, status, updated_at`,
    [bankTxId, userId]
  );
  return result.rows[0] || null;
}

async function unmatchTransaction(bankTxId, userId) {
  const result = await db.query(
    `UPDATE bank_transactions
     SET status = 'UNMATCHED',
         linked_expense_id = NULL,
         linked_income_id = NULL,
         updated_at = NOW()
     WHERE bank_tx_id = $1 AND user_id = $2
     RETURNING bank_tx_id, user_id, status, updated_at`,
    [bankTxId, userId]
  );
  return result.rows[0] || null;
}

async function remove(bankTxId, userId) {
  const result = await db.query(
    'DELETE FROM bank_transactions WHERE bank_tx_id = $1 AND user_id = $2 RETURNING bank_tx_id',
    [bankTxId, userId]
  );
  return result.rowCount > 0;
}

module.exports = {
  createBatch,
  getBatchesByUser,
  getBatchById,
  createTransactionsBulk,
  findTransactionsByUser,
  countTransactionsByUser,
  getSummary,
  findByIdAndUser,
  findExistingByReferenceOrSignature,
  findPossibleFinmanMatches,
  matchTransaction,
  postToLedger,
  excludeTransaction,
  unmatchTransaction,
  remove,
};
