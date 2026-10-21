# FinMan — Supabase Migration & Schema Recovery Package

This directory contains the complete, authoritative, and non-destructive PostgreSQL schema recovery and migration suite for migrating **FinMan — AI Personal Finance Assistant** to Supabase.

---

## 📁 Migration Package Overview

| File | Purpose | Supabase SQL Editor Compatible? |
|---|---|:---:|
| `all_in_one_supabase_migration.sql` | **Recommended:** Single master script executing full schema, constraints, triggers, RLS, categories seed, and sequence sync in one transaction | ✅ Yes |
| `00_preflight_checks.sql` | Preflight diagnostics: verifies PostgreSQL version (>=14), UTF-8 encoding, and schema conflict checks | ✅ Yes |
| `01_extensions_and_types.sql` | Installs `pgcrypto` extension under `extensions` schema and configures usage grants | ✅ Yes |
| `02_create_tables.sql` | Recreates all 18 application tables with complete unified columns (including onboarding, projects, and reminders) | ✅ Yes |
| `03_foreign_keys_and_indexes.sql` | Applies foreign key relationships, business CHECK constraints, unique constraints, and performance indexes | ✅ Yes |
| `04_functions_triggers_views.sql` | Creates `update_modified_column()` trigger function, updated_at triggers, and analytical views | ✅ Yes |
| `05_row_level_security_and_permissions.sql` | Enables Row Level Security (RLS) on all 18 tables with dual policies (service role bypass + user isolation) | ✅ Yes |
| `06_import_data.sql` | Seeds baseline essential categories (Food, Bills, Shopping, etc.) and optional development demo data | ✅ Yes |
| `07_sequence_and_identity_sync.sql` | Resynchronizes all SERIAL primary key sequences with max existing IDs to prevent insert collisions | ✅ Yes |
| `08_validation_checks.sql` | Post-migration verification suite: checks table presence (18/18), PKs, FKs, RLS status, and counts | ✅ Yes |
| `data/` | CSV templates for manual data import if recovering from external CSV sources | CSV Import Tool |

---

## 🚀 Execution Guide: How to Apply in Supabase

### Option A: Via Supabase Web Dashboard (Easiest & Recommended)

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard) and navigate to your project.
2. In the left navigation bar, click on **SQL Editor**.
3. Click **+ New Query**.
4. Open `all_in_one_supabase_migration.sql` in this directory, copy its entire contents, and paste into the SQL Editor.
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
6. Next, open a new SQL tab, paste `08_validation_checks.sql`, and click **Run** to verify that all 18 tables, primary keys, and security policies report `PASSED`.

---

### Option B: Step-by-Step Execution (For Granular Review)

If you prefer applying each phase individually, execute the files in exact numerical order:

```text
1. 00_preflight_checks.sql
2. 01_extensions_and_types.sql
3. 02_create_tables.sql
4. 03_foreign_keys_and_indexes.sql
5. 04_functions_triggers_views.sql
6. 05_row_level_security_and_permissions.sql
7. 06_import_data.sql
8. 07_sequence_and_identity_sync.sql
9. 08_validation_checks.sql
```

---

## 🔌 Connecting FinMan Backend to Supabase

Once the schema is created in Supabase:

1. In Supabase Dashboard, go to **Project Settings** → **Database**.
2. Find the **Connection string** section and select **URI** (or **Node.js**).
3. Under **Mode**, choose **Session** (Port 5432) or **Transaction Pooler** (Port 6543 via Supavisor).
4. Update your `backend/.env` file with your new Supabase credentials:

```dotenv
# Supabase PostgreSQL Configuration
DB_HOST=db.xxxxxxxxxxxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=YOUR_SUPABASE_DB_PASSWORD

# FinMan JWT Secret
JWT_SECRET=your_long_random_jwt_secret_here
JWT_EXPIRES_IN=7d
PORT=5000
```

5. Restart the FinMan backend:
```powershell
cd backend
npm run dev
```

The Express backend will connect directly to the newly restored Supabase database with all 18 tables and relationships ready.
