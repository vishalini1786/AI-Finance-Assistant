-- ==========================================================
-- 02_demo_data.sql
-- DEVELOPMENT-ONLY demo data. Do NOT run this against production.
--
-- The password hash below is a bcrypt hash (10 salt rounds) for the
-- plaintext demo password "Demo@1234". It was generated with the
-- same backend/src/utils/password.js helper used by the app, so you
-- can log in with:
--   email:    demo@finman.dev
--   password: Demo@1234
-- ==========================================================

INSERT INTO users (name, email, password_hash, phone, occupation, preferred_language, monthly_income, theme_preference)
VALUES (
    'Demo User',
    'demo@finman.dev',
    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q0N0f2X4Q6y3Zr9c1kk9G6yq0ftxa',
    '9999999999',
    'Software Engineer',
    'en',
    5000.00,
    'light'
)
ON CONFLICT (email) DO NOTHING;

-- Grab the demo user's id for the rest of the seed data.
DO $$
DECLARE
    demo_user_id INTEGER;
    food_cat_id INTEGER;
    bills_cat_id INTEGER;
    transport_cat_id INTEGER;
BEGIN
    SELECT user_id INTO demo_user_id FROM users WHERE email = 'demo@finman.dev';
    SELECT category_id INTO food_cat_id FROM categories WHERE name = 'Food';
    SELECT category_id INTO bills_cat_id FROM categories WHERE name = 'Bills';
    SELECT category_id INTO transport_cat_id FROM categories WHERE name = 'Transportation';

    -- Demo income
    INSERT INTO incomes (user_id, source, amount, income_date, description)
    VALUES
        (demo_user_id, 'Salary', 5000.00, CURRENT_DATE - INTERVAL '15 days', 'Monthly salary'),
        (demo_user_id, 'Freelance', 600.00, CURRENT_DATE - INTERVAL '5 days', 'Freelance web project');

    -- Demo expenses
    INSERT INTO expenses (user_id, category_id, amount, expense_date, merchant_name, payment_mode, description, source_type)
    VALUES
        (demo_user_id, food_cat_id, 45.50, CURRENT_DATE - INTERVAL '2 days', 'Whole Foods', 'CARD', 'Weekly groceries', 'MANUAL'),
        (demo_user_id, bills_cat_id, 120.00, CURRENT_DATE - INTERVAL '10 days', 'City Electric', 'BANK_TRANSFER', 'Electricity bill', 'MANUAL'),
        (demo_user_id, transport_cat_id, 30.00, CURRENT_DATE - INTERVAL '1 days', 'Uber', 'CARD', 'Ride to airport', 'MANUAL');

    -- Demo budgets for the current month
    INSERT INTO budgets (user_id, category_id, budget_amount, month, year)
    VALUES
        (demo_user_id, food_cat_id, 400.00, EXTRACT(MONTH FROM CURRENT_DATE)::SMALLINT, EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT),
        (demo_user_id, bills_cat_id, 250.00, EXTRACT(MONTH FROM CURRENT_DATE)::SMALLINT, EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT)
    ON CONFLICT (user_id, category_id, month, year) DO NOTHING;
END $$;
