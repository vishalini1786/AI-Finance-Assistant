-- 15_liabilities_and_bank_transactions.sql
-- Migration: Add extended liability fields, liability repayment tracking, and bank transaction management.

-- 1. Extend liabilities table with full tracking attributes
ALTER TABLE liabilities
  ADD COLUMN IF NOT EXISTS lender VARCHAR(150),
  ADD COLUMN IF NOT EXISTS emi_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_frequency VARCHAR(30) DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS tenure_months INTEGER,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Safe constraints for liabilities
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_liabilities_status') THEN
    ALTER TABLE liabilities ADD CONSTRAINT chk_liabilities_status
      CHECK (status IN ('ACTIVE', 'PAID_OFF', 'ARCHIVED'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_liabilities_amounts') THEN
    ALTER TABLE liabilities ADD CONSTRAINT chk_liabilities_amounts
      CHECK (total_amount > 0 AND remaining_amount >= 0);
  END IF;

  ALTER TABLE liabilities DROP CONSTRAINT IF EXISTS chk_liabilities_type;
  ALTER TABLE liabilities ADD CONSTRAINT chk_liabilities_type
    CHECK (liability_type IN ('HOME_LOAN', 'EDUCATION_LOAN', 'VEHICLE_LOAN', 'PERSONAL_LOAN', 'CREDIT_CARD', 'BNPL', 'MORTGAGE', 'LOAN', 'OTHER'));
END $$;

CREATE INDEX IF NOT EXISTS idx_liabilities_user_status ON liabilities(user_id, status);
CREATE INDEX IF NOT EXISTS idx_liabilities_due_date ON liabilities(due_date);

-- 2. Create liability_payments table for repayment history & ledger tracking
CREATE TABLE IF NOT EXISTS liability_payments (
  payment_id SERIAL PRIMARY KEY,
  liability_id INTEGER NOT NULL REFERENCES liabilities(liability_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  principal_amount NUMERIC(14,2) DEFAULT 0 CHECK (principal_amount >= 0),
  interest_amount NUMERIC(14,2) DEFAULT 0 CHECK (interest_amount >= 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode VARCHAR(50) DEFAULT 'BANK_TRANSFER',
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liability_payments_liability ON liability_payments(liability_id);
CREATE INDEX IF NOT EXISTS idx_liability_payments_user_date ON liability_payments(user_id, payment_date);

-- 3. Create bank_import_batches table for statement upload history
CREATE TABLE IF NOT EXISTS bank_import_batches (
  batch_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_format VARCHAR(20) NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_import_batches_user ON bank_import_batches(user_id, created_at DESC);

-- 4. Create bank_transactions table for imported bank records
CREATE TABLE IF NOT EXISTS bank_transactions (
  bank_tx_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  batch_id INTEGER REFERENCES bank_import_batches(batch_id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
  reference_no VARCHAR(100),
  source_account VARCHAR(100),
  category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'UNMATCHED' CHECK (status IN ('UNMATCHED', 'MATCHED', 'POSTED', 'EXCLUDED')),
  linked_expense_id INTEGER REFERENCES expenses(expense_id) ON DELETE SET NULL,
  linked_income_id INTEGER REFERENCES incomes(income_id) ON DELETE SET NULL,
  match_notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_date ON bank_transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_batch ON bank_transactions(batch_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_ref ON bank_transactions(user_id, reference_no);
