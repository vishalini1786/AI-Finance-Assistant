# FinMan Database (PostgreSQL)

This folder contains the full database schema for the FinMan application:
15 entities, constraints, indexes, and seed data.

## Folder structure

```
database/
├── schema/
│   ├── 01_extensions.sql     # PostgreSQL extensions
│   ├── 02_create_tables.sql  # All 15 tables (PK/FK/NOT NULL/DEFAULT)
│   ├── 03_constraints.sql    # CHECK constraints and extra UNIQUE keys
│   └── 04_indexes.sql        # Indexes on foreign keys & filter columns
├── seed/
│   ├── 01_categories.sql     # Predefined expense categories (always run)
│   └── 02_demo_data.sql      # Dev-only demo user + sample records
├── queries/                  # Reference copies of the raw SQL used by
│                              # the backend repositories (for review/testing)
└── README.md
```

## Prerequisites

- PostgreSQL 14+ installed and running
- `psql` CLI available on your PATH

## 1. Create the database

```bash
createdb finman_db
```

Or from `psql`:

```sql
CREATE DATABASE finman_db;
```

## 2. Run the schema files, in order

```bash
psql -d finman_db -f database/schema/01_extensions.sql
psql -d finman_db -f database/schema/02_create_tables.sql
psql -d finman_db -f database/schema/03_constraints.sql
psql -d finman_db -f database/schema/04_indexes.sql
```

## 3. Seed the database

```bash
psql -d finman_db -f database/seed/01_categories.sql   # required
psql -d finman_db -f database/seed/02_demo_data.sql     # optional, dev only
```

The demo user created by `02_demo_data.sql` can log in with:

- email: `demo@finman.dev`
- password: `Demo@1234`

## Entity list (15 tables)

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | Account/profile info, bcrypt password hash |
| 2 | `categories` | Shared predefined expense categories |
| 3 | `incomes` | User income records |
| 4 | `expenses` | User expense records (manual, OCR, or recurring) |
| 5 | `budgets` | Monthly per-category budget limits |
| 6 | `financial_holdings` | Investments / assets |
| 7 | `liabilities` | Loans, credit cards, mortgages |
| 8 | `recurring_payments` | Subscriptions / recurring bills |
| 9 | `taxes` | Tax records |
| 10 | `financial_documents` | Uploaded receipts/statements (for OCR) |
| 11 | `document_transactions` | OCR-extracted line items from a document |
| 12 | `ai_insights` | AI-generated recommendations/alerts |
| 13 | `financial_goals` | Savings/financial goals |
| 14 | `life_event_simulations` | "What-if" life event simulation results |
| 15 | `notifications` | In-app notifications |

Only `users`, `categories`, `incomes`, `expenses`, and `budgets` have
working APIs in Phase 1. The rest of the tables exist so the schema
matches the full approved ER diagram, and will get their APIs in
later phases (see the root project instructions, Steps 21+).

## Notes

- All foreign keys use `ON DELETE CASCADE` (or `SET NULL` where the
  child record should survive) so deleting a user cleans up their data.
- Money columns use `NUMERIC(14,2)` — never `FLOAT` — to avoid rounding
  errors.
- Derived values like "budget utilization %" or "net worth" are **not**
  stored; they're calculated on read from the raw data (see
  `database/queries/`).
