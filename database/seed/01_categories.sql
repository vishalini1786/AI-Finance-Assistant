-- ==========================================================
-- 01_categories.sql
-- Predefined categories shared by every user.
-- Safe to re-run: ON CONFLICT DO NOTHING avoids duplicates.
-- ==========================================================

INSERT INTO categories (name, description) VALUES
    ('Food',           'Groceries, restaurants and takeout'),
    ('Shopping',       'Clothing, electronics and general shopping'),
    ('Medical',        'Doctor visits, medicine and health expenses'),
    ('Education',      'Tuition, courses and books'),
    ('Transportation', 'Fuel, public transport, ride-hailing'),
    ('Entertainment',  'Movies, games, subscriptions and hobbies'),
    ('Bills',          'Electricity, water, internet and phone bills'),
    ('Insurance',      'Health, life and vehicle insurance premiums'),
    ('Investments',    'Money moved into investment accounts'),
    ('Others',         'Anything that does not fit another category')
ON CONFLICT (name) DO NOTHING;
