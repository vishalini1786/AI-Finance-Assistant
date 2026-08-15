-- ==========================================================
-- 04_indexes.sql
-- Indexes for foreign keys and columns used heavily in
-- WHERE / ORDER BY clauses (dashboard, filtering by user + date).
-- ==========================================================

-- INCOME
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_income_date ON incomes(income_date);

-- EXPENSE
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date);

-- BUDGET
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month_year ON budgets(user_id, month, year);

-- FINANCIAL_HOLDING
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON financial_holdings(user_id);

-- LIABILITY
CREATE INDEX IF NOT EXISTS idx_liabilities_user_id ON liabilities(user_id);

-- RECURRING_PAYMENT
CREATE INDEX IF NOT EXISTS idx_recurring_user_id ON recurring_payments(user_id);

-- TAX
CREATE INDEX IF NOT EXISTS idx_taxes_user_id ON taxes(user_id);

-- FINANCIAL_DOCUMENT
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON financial_documents(user_id);

-- DOCUMENT_TRANSACTION
CREATE INDEX IF NOT EXISTS idx_doc_transactions_document_id ON document_transactions(document_id);

-- AI_INSIGHT
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);

-- FINANCIAL_GOAL
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON financial_goals(user_id);

-- LIFE_EVENT_SIMULATION
CREATE INDEX IF NOT EXISTS idx_life_events_user_id ON life_event_simulations(user_id);

-- NOTIFICATION
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
