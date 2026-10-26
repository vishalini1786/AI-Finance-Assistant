// liabilities_and_bank_transactions.test.js
// Comprehensive test suite for Liabilities Management, Bank Statement Transactions, and Gemini diagnostics.

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const XLSX = require('xlsx');

describe('FinMan Liabilities, Bank Transactions & Gemini Diagnostic Suite', () => {
  jest.setTimeout(35000);

  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;
  let defaultCategoryId;

  let createdLiabilityId;
  let createdBankTxId;
  let existingExpenseId;
  let existingIncomeId;

  beforeAll(async () => {
    // 1. Register User 1
    const email1 = `liab_tester_${Date.now()}@example.com`;
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'Liability Primary User',
      email: email1,
      password: 'Password@123',
    });
    user1Token = res1.body.data.token;
    user1Id = res1.body.data.user.user_id;

    // 2. Register User 2 (to verify ownership & unauthorized access boundaries)
    const email2 = `liab_other_${Date.now()}@example.com`;
    const res2 = await request(app).post('/api/auth/register').send({
      name: 'Liability Other User',
      email: email2,
      password: 'Password@123',
    });
    user2Token = res2.body.data.token;
    user2Id = res2.body.data.user.user_id;

    // 3. Find a seeded category for expense posting tests
    const catRes = await db.query('SELECT category_id FROM categories LIMIT 1');
    defaultCategoryId = catRes.rows[0]?.category_id;

    // 4. Seed an existing manual expense & income for reconciliation tests
    const expRes = await db.query(
      `INSERT INTO expenses (user_id, category_id, amount, expense_date, description)
       VALUES ($1, $2, 1250.00, '2026-10-15', 'Supermarket Grocery Run')
       RETURNING expense_id`,
      [user1Id, defaultCategoryId]
    );
    existingExpenseId = expRes.rows[0].expense_id;

    const incRes = await db.query(
      `INSERT INTO incomes (user_id, source, amount, income_date, description)
       VALUES ($1, 'Freelance', 45000.00, '2026-10-16', 'Consulting Retainer')
       RETURNING income_id`,
      [user1Id]
    );
    existingIncomeId = incRes.rows[0].income_id;
  });

  afterAll(async () => {
    // Clean up test data
    if (user1Id) {
      await db.query('DELETE FROM users WHERE user_id = $1', [user1Id]).catch(() => null);
    }
    if (user2Id) {
      await db.query('DELETE FROM users WHERE user_id = $1', [user2Id]).catch(() => null);
    }
  });

  // =================================================================
  // MODULE 1: LIABILITIES MANAGEMENT
  // =================================================================
  describe('Module 1: Liabilities Management Endpoints', () => {
    it('1. Rejects liability creation with invalid amounts (zero or negative total)', async () => {
      const res = await request(app)
        .post('/api/liabilities')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Invalid Loan',
          liabilityType: 'PERSONAL_LOAN',
          totalAmount: -5000,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('greater than zero');
    });

    it('2. Rejects liability creation when outstanding balance exceeds original principal', async () => {
      const res = await request(app)
        .post('/api/liabilities')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Invalid Balance Loan',
          liabilityType: 'PERSONAL_LOAN',
          totalAmount: 100000,
          remainingAmount: 150000,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('cannot exceed original principal');
    });

    it('3. Rejects liability creation with invalid interest rate', async () => {
      const res = await request(app)
        .post('/api/liabilities')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'High Interest Loan',
          liabilityType: 'PERSONAL_LOAN',
          totalAmount: 50000,
          interestRate: 150,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('between 0% and 100%');
    });

    it('4. Rejects liability creation with invalid dates', async () => {
      const res = await request(app)
        .post('/api/liabilities')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Invalid Date Loan',
          liabilityType: 'PERSONAL_LOAN',
          totalAmount: 50000,
          dueDate: 'not-a-valid-date',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Due date must be a valid date');
    });

    it('5. Successfully creates a liability with complete attributes', async () => {
      const res = await request(app)
        .post('/api/liabilities')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'HDFC Bank Home Loan',
          liabilityType: 'HOME_LOAN',
          lender: 'HDFC Bank Ltd',
          totalAmount: 3000000,
          remainingAmount: 2400000,
          interestRate: 8.5,
          emiAmount: 26000,
          paymentFrequency: 'MONTHLY',
          startDate: '2024-01-15',
          dueDate: '2026-11-05',
          tenureMonths: 240,
          notes: 'Fixed-then-floating rate loan',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const liab = res.body.data;
      expect(liab.name).toBe('HDFC Bank Home Loan');
      expect(liab.liability_type).toBe('HOME_LOAN');
      expect(liab.lender).toBe('HDFC Bank Ltd');
      expect(liab.total_amount).toBe(3000000);
      expect(liab.remaining_amount).toBe(2400000);
      expect(liab.interest_rate).toBe(8.5);
      expect(liab.emi_amount).toBe(26000);
      expect(liab.due_date).toBe('2026-11-05');
      expect(liab.status).toBe('ACTIVE');
      expect(liab.progress_percentage).toBe(20);

      createdLiabilityId = liab.liability_id;
    });

    it('6. Lists liabilities and calculates summary figures for authenticated user', async () => {
      const res = await request(app)
        .get('/api/liabilities')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.liabilities)).toBe(true);
      expect(res.body.data.liabilities.length).toBeGreaterThan(0);

      const summary = res.body.data.summary;
      expect(summary.totalLiabilities).toBe(2400000);
      expect(summary.activeCount).toBe(1);
      expect(summary.totalMonthlyEmi).toBe(26000);
      expect(summary.upcomingPayment).not.toBeNull();
      expect(summary.upcomingPayment.name).toBe('HDFC Bank Home Loan');
    });

    it('7. Fetches a single liability by ID including payment history', async () => {
      const res = await request(app)
        .get(`/api/liabilities/${createdLiabilityId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.liability_id).toBe(createdLiabilityId);
      expect(Array.isArray(res.body.data.payments)).toBe(true);
      expect(res.body.data.payments.length).toBe(0);
    });

    it('8. Prevents unauthorized user from reading or modifying another user\'s liability', async () => {
      // User 2 attempts to fetch User 1's liability
      const getRes = await request(app)
        .get(`/api/liabilities/${createdLiabilityId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(getRes.status).toBe(404);

      // User 2 attempts to update User 1's liability
      const putRes = await request(app)
        .put(`/api/liabilities/${createdLiabilityId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked Loan' });

      expect(putRes.status).toBe(404);

      // User 2 attempts to record payment on User 1's liability
      const payRes = await request(app)
        .post(`/api/liabilities/${createdLiabilityId}/payments`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ amount: 1000 });

      expect(payRes.status).toBe(404);
    });

    it('9. Updates a liability record', async () => {
      const res = await request(app)
        .put(`/api/liabilities/${createdLiabilityId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'HDFC Home Loan - Refinanced',
          interestRate: 8.1,
          emiAmount: 25000,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('HDFC Home Loan - Refinanced');
      expect(res.body.data.interest_rate).toBe(8.1);
      expect(res.body.data.emi_amount).toBe(25000);
    });

    it('10. Records an atomic repayment against the liability', async () => {
      const res = await request(app)
        .post(`/api/liabilities/${createdLiabilityId}/payments`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          amount: 50000,
          principalAmount: 30000,
          interestAmount: 20000,
          paymentDate: '2026-10-20',
          paymentMode: 'BANK_TRANSFER',
          notes: 'October EMI + Part prepay',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const { payment, liability } = res.body.data;
      expect(payment.amount).toBe(50000);
      expect(payment.principal_amount).toBe(30000);
      expect(payment.interest_amount).toBe(20000);

      // Outstanding balance must be reduced by exactly the principal amount: 2,400,000 - 30,000 = 2,370,000
      expect(liability.remaining_amount).toBe(2370000);
      expect(liability.status).toBe('ACTIVE');

      // Next due date was automatically advanced by 1 month: 2026-11-05 -> 2026-12-05
      expect(liability.due_date).toBe('2026-12-05');
    });

    it('11. Full payment automatically clears debt and marks status as PAID_OFF', async () => {
      // Create a small short-term debt of ₹10,000
      const smallRes = await request(app)
        .post('/api/liabilities')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Gadget BNPL Balance',
          liabilityType: 'BNPL',
          totalAmount: 10000,
          remainingAmount: 10000,
        });

      const smallId = smallRes.body.data.liability_id;

      // Make full payment of ₹10,000
      const payRes = await request(app)
        .post(`/api/liabilities/${smallId}/payments`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          amount: 10000,
          principalAmount: 10000,
          interestAmount: 0,
        });

      expect(payRes.status).toBe(201);
      expect(payRes.body.data.liability.remaining_amount).toBe(0);
      expect(payRes.body.data.liability.status).toBe('PAID_OFF');

      // Attempting to record another payment on paid-off loan should fail gracefully
      const extraPayRes = await request(app)
        .post(`/api/liabilities/${smallId}/payments`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ amount: 500 });

      expect(extraPayRes.status).toBe(400);
      const errText = extraPayRes.body.message || extraPayRes.body.error || '';
      expect(errText).toContain('already paid off');
    });

    it('12. Archives and deletes liability records correctly', async () => {
      // Archive
      const archiveRes = await request(app)
        .patch(`/api/liabilities/${createdLiabilityId}/archive`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.status).toBe('ARCHIVED');

      // Delete
      const deleteRes = await request(app)
        .delete(`/api/liabilities/${createdLiabilityId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toContain('deleted successfully');

      // Verify not found
      const verifyRes = await request(app)
        .get(`/api/liabilities/${createdLiabilityId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(verifyRes.status).toBe(404);
    });
  });

  // =================================================================
  // MODULE 2: BANK TRANSACTIONS & RECONCILIATION
  // =================================================================
  describe('Module 2: Bank Statement Upload & Reconciliation', () => {
    it('1. Parses valid CSV statement buffer and returns column detection & duplicates preview', async () => {
      const csvContent = [
        'Date,Narration,Withdrawal,Deposit,Ref No',
        '2026-10-15,Supermarket Grocery Run,1250.00,,REF1001',
        '2026-10-16,Acme Corp Consulting,,45000.00,REF1002',
        '2026-10-17,Fuel Station Petrol,2500.00,,REF1003',
      ].join('\n');

      const res = await request(app)
        .post('/api/bank-transactions/parse-preview')
        .set('Authorization', `Bearer ${user1Token}`)
        .attach('file', Buffer.from(csvContent), 'statement_oct.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const preview = res.body.data;
      expect(preview.totalRows).toBe(3);
      expect(preview.validRowsCount).toBe(3);
      expect(preview.totalDebits).toBe(3750); // 1250 + 2500
      expect(preview.totalCredits).toBe(45000);

      // Verify automated column mapping
      expect(preview.mapping.dateColumn).toBe('Date');
      expect(preview.mapping.descriptionColumn).toBe('Narration');
      expect(preview.mapping.debitColumn).toBe('Withdrawal');
      expect(preview.mapping.creditColumn).toBe('Deposit');
      expect(preview.mapping.referenceColumn).toBe('Ref No');

      // Verify FinMan match suggestion for row 1 (matches existing expense of ₹1,250 on 2026-10-15)
      const row1 = preview.rows[0];
      expect(row1.hasFinmanMatch).toBe(true);
      expect(row1.possibleMatches.length).toBeGreaterThan(0);
      expect(row1.possibleMatches[0].id).toBe(existingExpenseId);

      // Verify FinMan match suggestion for row 2 (matches existing income of ₹45,000 on 2026-10-16)
      const row2 = preview.rows[1];
      expect(row2.hasFinmanMatch).toBe(true);
      expect(row2.possibleMatches[0].id).toBe(existingIncomeId);
    });

    it('2. Parses valid XLSX statement buffer correctly', async () => {
      // Build a minimal in-memory Excel workbook
      const wsData = [
        ['Transaction Date', 'Particulars', 'Debit Amount', 'Credit Amount', 'Balance'],
        ['2026-10-18', 'Coffee Shop', '350.00', '', '98000'],
        ['2026-10-19', 'Dividend Credit', '', '1800.00', '99800'],
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Statement');
      const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const res = await request(app)
        .post('/api/bank-transactions/parse-preview')
        .set('Authorization', `Bearer ${user1Token}`)
        .attach('file', xlsxBuffer, 'bank_statement.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.data.validRowsCount).toBe(2);
      expect(res.body.data.totalDebits).toBe(350);
      expect(res.body.data.totalCredits).toBe(1800);
    });

    it('3. Rejects unsupported file formats (e.g. executable or zip)', async () => {
      const res = await request(app)
        .post('/api/bank-transactions/parse-preview')
        .set('Authorization', `Bearer ${user1Token}`)
        .attach('file', Buffer.from('FAKE BINARY CONTENT'), 'malicious.exe');

      expect(res.status).toBe(400);
      const errText = res.body.message || res.body.error || '';
      expect(errText).toContain('CSV, TSV, XLSX, or XLS');
    });

    it('4. Commits an import batch and persists bank transactions in database', async () => {
      const transactionsToImport = [
        {
          transactionDate: '2026-10-15',
          description: 'Supermarket Grocery Run',
          amount: 1250.00,
          direction: 'DEBIT',
          referenceNo: 'TXN-BANK-001',
        },
        {
          transactionDate: '2026-10-16',
          description: 'Client Project Advance',
          amount: 15000.00,
          direction: 'CREDIT',
          referenceNo: 'TXN-BANK-002',
        },
        {
          transactionDate: '2026-10-17',
          description: 'Metro Monthly Pass',
          amount: 800.00,
          direction: 'DEBIT',
          referenceNo: 'TXN-BANK-003',
        },
        {
          transactionDate: '2026-10-18',
          description: 'Internal Savings Transfer',
          amount: 5000.00,
          direction: 'DEBIT',
          referenceNo: 'TXN-BANK-004',
          excluded: true, // User chose to skip
        },
      ];

      const res = await request(app)
        .post('/api/bank-transactions/commit-import')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          filename: 'HDFC_Oct_2026.csv',
          fileFormat: 'CSV',
          transactions: transactionsToImport,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.importedCount).toBe(3);
      expect(res.body.data.skippedCount).toBe(1);
      expect(res.body.data.batch.filename).toBe('HDFC_Oct_2026.csv');

      createdBankTxId = res.body.data.transactions[0].bank_tx_id;
    });

    it('5. Detects duplicates on subsequent uploads with matching reference numbers or signatures', async () => {
      const duplicateCsv = [
        'Date,Narration,Withdrawal,Deposit,Ref No',
        '2026-10-15,Supermarket Grocery Run,1250.00,,TXN-BANK-001', // Exact reference duplicate
        '2026-10-21,New Restaurant Lunch,650.00,,REF-NEW-99',
      ].join('\n');

      const res = await request(app)
        .post('/api/bank-transactions/parse-preview')
        .set('Authorization', `Bearer ${user1Token}`)
        .attach('file', Buffer.from(duplicateCsv), 'statement_duplicate_test.csv');

      expect(res.status).toBe(200);
      expect(res.body.data.duplicateCount).toBe(1);

      const dupRow = res.body.data.rows[0];
      expect(dupRow.isDuplicate).toBe(true);
      expect(dupRow.duplicateReason).toContain('TXN-BANK-001');

      const newRow = res.body.data.rows[1];
      expect(newRow.isDuplicate).toBe(false);
    });

    it('6. Lists imported bank transactions and verifies summary counts', async () => {
      const res = await request(app)
        .get('/api/bank-transactions')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(3);
      expect(res.body.data.summary.totalTransactions).toBe(3);
      expect(res.body.data.summary.pendingReviewCount).toBe(3);
    });

    it('7. Reconciles / matches bank transaction with an existing FinMan record', async () => {
      const res = await request(app)
        .post(`/api/bank-transactions/${createdBankTxId}/match`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          expenseId: existingExpenseId,
          matchNotes: 'Reconciled with manual receipt',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('MATCHED');
      expect(res.body.data.linked_expense_id).toBe(existingExpenseId);
    });

    it('8. Posts an unmatched debit bank transaction directly to FinMan Expense Ledger', async () => {
      // Find the second debit transaction (Metro Pass - ₹800)
      const listRes = await request(app)
        .get('/api/bank-transactions?status=UNMATCHED&direction=DEBIT')
        .set('Authorization', `Bearer ${user1Token}`);

      const metroTx = listRes.body.data.items[0];
      expect(metroTx).toBeDefined();

      const postRes = await request(app)
        .post(`/api/bank-transactions/${metroTx.bank_tx_id}/post-to-ledger`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          categoryId: defaultCategoryId,
          description: 'Metro Monthly Pass - Posted from Bank',
        });

      expect(postRes.status).toBe(201);
      expect(postRes.body.data.type).toBe('EXPENSE');
      expect(Number(postRes.body.data.record.amount)).toBe(metroTx.amount);

      // Verify bank transaction is now marked POSTED
      const checkRes = await request(app)
        .get(`/api/bank-transactions/${metroTx.bank_tx_id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(checkRes.body.data.status).toBe('POSTED');
      expect(checkRes.body.data.linked_expense_id).toBe(postRes.body.data.record.expense_id);
    });

    it('9. Posts an unmatched credit bank transaction directly to FinMan Income Ledger', async () => {
      const listRes = await request(app)
        .get('/api/bank-transactions?status=UNMATCHED&direction=CREDIT')
        .set('Authorization', `Bearer ${user1Token}`);

      const advanceTx = listRes.body.data.items[0];
      expect(advanceTx).toBeDefined();

      const postRes = await request(app)
        .post(`/api/bank-transactions/${advanceTx.bank_tx_id}/post-to-ledger`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          source: 'Client Direct Deposit',
          description: 'Client Project Advance - Posted from Bank',
        });

      expect(postRes.status).toBe(201);
      expect(postRes.body.data.type).toBe('INCOME');
      expect(Number(postRes.body.data.record.amount)).toBe(advanceTx.amount);

      // Verify bank transaction is now marked POSTED
      const checkRes = await request(app)
        .get(`/api/bank-transactions/${advanceTx.bank_tx_id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(checkRes.body.data.status).toBe('POSTED');
      expect(checkRes.body.data.linked_income_id).toBe(postRes.body.data.record.income_id);
    });

    it('10. Excludes transaction from financial statements', async () => {
      // Insert one extra transaction to test exclude
      const insertRes = await request(app)
        .post('/api/bank-transactions/commit-import')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          filename: 'test_exclude.csv',
          fileFormat: 'CSV',
          transactions: [
            {
              transactionDate: '2026-10-22',
              description: 'Friend Reimbursement Transfer',
              amount: 2000,
              direction: 'DEBIT',
            },
          ],
        });

      const txId = insertRes.body.data.transactions[0].bank_tx_id;

      const exclRes = await request(app)
        .patch(`/api/bank-transactions/${txId}/exclude`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(exclRes.status).toBe(200);
      expect(exclRes.body.data.status).toBe('EXCLUDED');

      // Unmatch / reset
      const resetRes = await request(app)
        .patch(`/api/bank-transactions/${txId}/unmatch`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.data.status).toBe('UNMATCHED');
    });

    it('11. Fetches upload batch history for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/bank-transactions/batches')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].filename).toBeDefined();
    });
  });

  // =================================================================
  // MODULE 4: GEMINI SAFE DIAGNOSTICS & CONNECTION TEST
  // =================================================================
  describe('Module 4: Gemini API Integration & Safe Diagnostics', () => {
    it('1. GET /api/dashboard/ai/diagnostics returns sanitized provider status without leaking secrets', async () => {
      const res = await request(app)
        .get('/api/dashboard/ai/diagnostics')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const diag = res.body.data;
      expect(diag.provider).toBe('Google Gemini');
      expect(typeof diag.configured).toBe('boolean');
      expect(diag.model).toBeDefined();
      expect(diag.status).toBeDefined();
      expect(diag.statusLabel).toBeDefined();

      // STRICT SECURITY CHECK: Ensure API key is NEVER revealed in response
      expect(diag.apiKey).toBeUndefined();
      expect(diag.key).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(/AIza[0-9A-Za-z-_]{35}/);
    });

    it('2. POST /api/dashboard/ai/test-connection safely runs provider probe', async () => {
      const res = await request(app)
        .post('/api/dashboard/ai/test-connection')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const testResult = res.body.data;
      expect(typeof testResult.healthy).toBe('boolean');
      expect(testResult.status).toBeDefined();
      expect(testResult.statusLabel).toBeDefined();
      expect(testResult.message).toBeDefined();

      // STRICT SECURITY CHECK: Secrets are never returned
      expect(testResult.apiKey).toBeUndefined();
      expect(testResult.key).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(/AIza[0-9A-Za-z-_]{35}/);
    });
  });
});
