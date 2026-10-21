-- =====================================================================
-- FinMan Database Migration to Supabase
-- File: 06_import_data.sql
-- Description: Seeds the authoritative baseline categories and optional
--              development demo records.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BASELINE ESSENTIAL CATEGORIES (REQUIRED FOR APP OPERATION)
-- ---------------------------------------------------------------------
INSERT INTO public.categories (category_id, name, description, priority, user_id) VALUES
    (1,  'Food',           'Groceries, restaurants and takeout',          'ESSENTIAL', NULL),
    (2,  'Shopping',       'Clothing, electronics and general shopping',  'DISCRETIONARY', NULL),
    (3,  'Medical',        'Doctor visits, medicine and health expenses', 'CRITICAL', NULL),
    (4,  'Education',      'Tuition, courses and books',                  'IMPORTANT', NULL),
    (5,  'Transportation', 'Fuel, public transport, ride-hailing',        'ESSENTIAL', NULL),
    (6,  'Entertainment',  'Movies, games, subscriptions and hobbies',    'DISCRETIONARY', NULL),
    (7,  'Bills',          'Electricity, water, internet and phone bills','CRITICAL', NULL),
    (8,  'Insurance',      'Health, life and vehicle insurance premiums', 'IMPORTANT', NULL),
    (9,  'Investments',    'Money moved into investment accounts',        'IMPORTANT', NULL),
    (10, 'Others',         'Anything that does not fit another category', 'FLEXIBLE', NULL)
ON CONFLICT (category_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority;

-- ---------------------------------------------------------------------
-- 2. DEVELOPMENT DEMO USER & SAMPLE RECORDS (OPTIONAL / DEV ONLY)
-- Set v_seed_demo_data := TRUE to load demo user, or FALSE to skip.
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_seed_demo_data BOOLEAN := FALSE; -- CHANGE TO TRUE IF TESTING WITH DEMO USER
    v_demo_user_id INTEGER;
    v_food_cat_id INTEGER;
    v_bills_cat_id INTEGER;
    v_transport_cat_id INTEGER;
BEGIN
    IF v_seed_demo_data THEN
        RAISE NOTICE 'Seeding development demo data...';

        -- Demo user with bcrypt password hash for "Demo@1234"
        INSERT INTO public.users (
            name, email, password_hash, phone, occupation, 
            preferred_language, monthly_income, theme_preference, is_onboarded
        )
        VALUES (
            'Demo User',
            'demo@finman.dev',
            '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q0N0f2X4Q6y3Zr9c1kk9G6yq0ftxa',
            '9999999999',
            'Software Engineer',
            'en',
            5000.00,
            'light',
            TRUE
        )
        ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            password_hash = EXCLUDED.password_hash
        RETURNING user_id INTO v_demo_user_id;

        IF v_demo_user_id IS NULL THEN
            SELECT user_id INTO v_demo_user_id FROM public.users WHERE email = 'demo@finman.dev';
        END IF;

        SELECT category_id INTO v_food_cat_id FROM public.categories WHERE name = 'Food';
        SELECT category_id INTO v_bills_cat_id FROM public.categories WHERE name = 'Bills';
        SELECT category_id INTO v_transport_cat_id FROM public.categories WHERE name = 'Transportation';

        -- Demo Incomes
        INSERT INTO public.incomes (user_id, source, amount, income_date, description)
        VALUES
            (v_demo_user_id, 'Salary', 5000.00, CURRENT_DATE - INTERVAL '15 days', 'Monthly salary'),
            (v_demo_user_id, 'Freelance', 600.00, CURRENT_DATE - INTERVAL '5 days', 'Freelance web project');

        -- Demo Expenses
        INSERT INTO public.expenses (user_id, category_id, amount, expense_date, merchant_name, payment_mode, description, source_type)
        VALUES
            (v_demo_user_id, v_food_cat_id, 45.50, CURRENT_DATE - INTERVAL '2 days', 'Whole Foods', 'CARD', 'Weekly groceries', 'MANUAL'),
            (v_demo_user_id, v_bills_cat_id, 120.00, CURRENT_DATE - INTERVAL '10 days', 'City Electric', 'BANK_TRANSFER', 'Electricity bill', 'MANUAL'),
            (v_demo_user_id, v_transport_cat_id, 30.00, CURRENT_DATE - INTERVAL '1 days', 'Uber', 'CARD', 'Ride to airport', 'MANUAL');

        -- Demo Budgets
        INSERT INTO public.budgets (user_id, category_id, budget_amount, month, year, priority)
        VALUES
            (v_demo_user_id, v_food_cat_id, 400.00, EXTRACT(MONTH FROM CURRENT_DATE)::SMALLINT, EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT, 'ESSENTIAL'),
            (v_demo_user_id, v_bills_cat_id, 250.00, EXTRACT(MONTH FROM CURRENT_DATE)::SMALLINT, EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT, 'CRITICAL')
        ON CONFLICT (user_id, category_id, month, year) DO NOTHING;

        -- Demo Financial Goals
        INSERT INTO public.financial_goals (user_id, goal_name, target_amount, current_amount, target_date, status)
        VALUES
            (v_demo_user_id, 'Emergency Fund', 10000.00, 3500.00, CURRENT_DATE + INTERVAL '6 months', 'IN_PROGRESS'),
            (v_demo_user_id, 'Vacation Trip', 2500.00, 800.00, CURRENT_DATE + INTERVAL '3 months', 'IN_PROGRESS');

        RAISE NOTICE '✓ Demo data seeded successfully for demo@finman.dev.';
    ELSE
        RAISE NOTICE 'Skipping demo data (v_seed_demo_data is FALSE). Baseline categories seeded.';
    END IF;
END $$;
