-- ==========================================================
-- 17_loan_repayment_automation.sql
-- Adds automatic interest calculation attributes, repayment method,
-- remaining principal audit trail, and interest expense linkage.
-- ==========================================================

-- 1. Extend liabilities table
ALTER TABLE liabilities
  ADD COLUMN IF NOT EXISTS interest_calculation_method VARCHAR(30) DEFAULT 'REDUCING_BALANCE',
  ADD COLUMN IF NOT EXISTS repayment_method VARCHAR(50) DEFAULT 'EMI',
  ADD COLUMN IF NOT EXISTS first_payment_date DATE;

-- Safe constraint for interest calculation methods
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_liabilities_interest_calc') THEN
    ALTER TABLE liabilities ADD CONSTRAINT chk_liabilities_interest_calc
      CHECK (interest_calculation_method IN ('REDUCING_BALANCE', 'FLAT_RATE', 'ZERO_INTEREST', 'DAILY_REDUCING', 'CUSTOM'));
  END IF;
END $$;

-- 2. Extend liability_payments table
ALTER TABLE liability_payments
  ADD COLUMN IF NOT EXISTS remaining_principal NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expense_id INTEGER REFERENCES expenses(expense_id) ON DELETE SET NULL;

-- Index for quick lookup of payments and expense linkage
CREATE INDEX IF NOT EXISTS idx_liability_payments_expense ON liability_payments(expense_id);

