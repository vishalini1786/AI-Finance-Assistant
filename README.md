# FinMan: AI Personal Finance Assistant

A production-grade, full-stack personal finance and wealth management platform designed to help individuals, freelancers, and project managers track cash flows, forecast future expenses with Machine Learning, reconcile bank statements, extract receipt data with OCR, and interact with a contextual, finance-guarded AI advisor.

---

## 1. Project Overview

FinMan integrates modern web technologies, statistical machine learning models, and multimodal artificial intelligence to automate daily personal accounting. Unlike generic expense trackers, FinMan bridges the gap between passive record-keeping and proactive financial guidance through time-series expenditure forecasting, statistical anomaly detection, automated loan repayment schedules, and OCR-powered document ingestion.

The platform is architected as a distributed system:
- **Frontend**: Single Page Application built with React 18, Vite, and Tailwind CSS, deployed on Vercel.
- **Backend API**: RESTful service built with Node.js and Express, deployed on Render.
- **ML & OCR Microservice**: Python microservice built with FastAPI, Scikit-Learn, and Tesseract OCR, containerized via Docker on Render.
- **Database**: Cloud PostgreSQL managed via Supabase with SSL connection pooling.

---

## 2. Problem Statement

Modern personal financial management suffers from three key pain points:
1. **High Friction in Data Entry**: Manual entry of daily expenses, receipts, and bank statements leads to inconsistency and tracking abandonment.
2. **Lack of Predictive Foresight**: Standard dashboards only present historical data. Users cannot easily anticipate upcoming monthly expenditure or detect spending spikes until after their budget has been depleted.
3. **Disconnected Workspaces**: Individuals managing personal budgets alongside side-hustles or collaborative project expenses face commingled ledgers that distort personal balance sheets and tax planning.

---

## 3. Objectives

- **Automated Data Capture**: Support receipt OCR (Gemini Vision + Tesseract) and bank statement reconciliation (CSV/Excel) with duplicate detection.
- **Predictive Intelligence**: Deploy a trained Random Forest Regressor to forecast next month's total expenditure and category momentum using 17 temporal and behavioral features.
- **Spending Guardrails**: Flag statistical anomalies using category-specific dispersion envelopes ($Z$-score $\ge 2.0\sigma$ and Interquartile Envelopes) with persistent user dismissals.
- **Separation of Concerns**: Isolate personal household expenses from dedicated Project Workspace budgets.
- **Grounded Financial Guidance**: Provide a conversational AI assistant restricted to financial domain inquiries with strict prompt-injection defenses.

---

## 4. Key Features

- **Dashboard & Cash Flow Analytics**: Real-time income, expense, and surplus metric cards, dynamic income vs. expense 6-month trends, category breakdown charts, and rule-based Financial Health Scoring.
- **Future Expense Predictor**: Next-month total spending forecast powered by an ensemble Random Forest model, providing baseline comparisons, variance projections, and confidence ratings.
- **Spending That Looks Higher Than Usual**: Automated anomaly detection flagging unusual outlays without accusatory phrasing, with dismissal persistence to prevent alert fatigue.
- **Bank Statement Reconciliation**: Import CSV and XLSX statements, automatically parse narration and transaction dates, match against existing ledgers, detect duplicates, and post unrecorded transactions with a single click.
- **Receipt & Invoice OCR**: Dual-engine optical character recognition utilizing Google Gemini Vision with Tesseract 5 fallback to extract merchants, totals, tax amounts, and dates.
- **Smart Calendar & Recurring Bills**: Visual financial calendar plotting due dates, salary credits, recurring utility bills, and EMI payments with timely notification triggers.
- **Liabilities & Loan Amortization**: Automated interest and principal calculation supporting Reducing Balance and Flat Rate formulas across customizable repayment frequencies.
- **Project Workspaces**: Segregated project-level financial tracking with custom category envelopes, milestones, and budget caps.
- **Financial Reports**: Export comprehensive financial statements in PDF format with categorized breakdowns and balance sheet summaries.

---

## 5. Technology Stack

### Frontend
- **Framework**: React 18 (Hooks, Context API)
- **Tooling & Bundler**: Vite 5
- **Styling**: Tailwind CSS
- **Visualizations**: Recharts, Lucide React Icons
- **HTTP Client**: Axios with global interceptors
- **Hosting**: Vercel

### Backend API
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database Driver**: `pg` (Node Postgres with connection pooling)
- **Authentication**: JWT (JSON Web Tokens) with `bcrypt` password hashing
- **PDF Generation**: PDFKit
- **File Parsing**: Multer, XLSX
- **Hosting**: Render Web Service

### Machine Learning & OCR Microservice
- **Runtime**: Python 3.11
- **Framework**: FastAPI, Uvicorn
- **Machine Learning**: Scikit-Learn, NumPy, Pandas, Joblib
- **Computer Vision & OCR**: Tesseract OCR 5, Pillow, OpenCV Headless, PyPDFium2
- **Containerization**: Docker (Debian Slim)
- **Hosting**: Render Docker Web Service

### Database & Cloud
- **Database Engine**: PostgreSQL 15 (Supabase Cloud with SSL)
- **AI Provider**: Google Gemini API (`gemini-flash-lite-latest`)

---

## 6. System Architecture

```
                      +-----------------------------+
                      |       User Browser          |
                      |  React + Vite SPA (Vercel)  |
                      +--------------+--------------+
                                     |
                                     | HTTPS / JSON
                                     v
                      +-----------------------------+
                      |   Node.js / Express Backend |
                      |    API Service (Render)     |
                      +-------+--------------+------+
                              |              |
             Internal HTTP /  |              | PostgreSQL (SSL)
             JSON Microservice|              v
                              |      +---------------------+
                              |      | Supabase PostgreSQL |
                              v      +---------------------+
                      +-----------------------------+
                      |   Python FastAPI Service    |
                      |   (Docker on Render)        |
                      |  - Random Forest Regressor  |
                      |  - Category Classifier      |
                      |  - Z-Score/IQR Anomaly Unit |
                      |  - Tesseract 5 OCR Engine   |
                      +-----------------------------+
```

---

## 7. Project Folder Structure

```
AIFinanceAssistant/
├── .github/                     # GitHub workflows and issue templates
├── backend/                     # Node.js Express REST API
│   ├── ml-service/              # Python FastAPI ML & OCR Microservice
│   │   ├── models/              # Serialized ML models (.pkl, metadata .json)
│   │   ├── app.py               # FastAPI application endpoints
│   │   ├── Dockerfile           # Production container configuration
│   │   ├── requirements.txt     # Python dependencies
│   │   └── train_models.py      # ML model training and validation pipeline
│   ├── src/
│   │   ├── config/              # Database pool, env parser, Gemini config
│   │   ├── controllers/         # HTTP request orchestrators
│   │   ├── middleware/          # JWT auth, error handlers, upload guards
│   │   ├── repositories/        # SQL data access layers
│   │   ├── routes/              # Express endpoint definitions
│   │   ├── services/            # Business logic, AI guardrails, calculations
│   │   └── utils/               # Loan calculator, math helpers, logger
│   ├── package.json             # Backend dependencies
│   └── server.js                # Application entrypoint
├── database/
│   └── schema/                  # Modular idempotent SQL migrations (01 to 17)
├── frontend/                    # React Vite Single Page Application
│   ├── src/
│   │   ├── components/          # Reusable UI cards, tables, modals, charts
│   │   │   └── dashboard/       # MlExpenseForecast, MlSpendingAnomalies
│   │   ├── context/             # AuthContext, ThemeContext, LanguageContext
│   │   ├── pages/               # Dashboard, Expenses, BankTransactions, etc.
│   │   ├── services/            # Axios API wrappers
│   │   └── utils/               # Formatters, greeting helpers, math utils
│   ├── package.json             # Frontend dependencies
│   ├── vercel.json              # SPA routing rules for Vercel
│   └── vite.config.js           # Vite build and plugin configuration
├── render.yaml                  # Render Blueprint definition (Backend + ML)
├── vercel.json                  # Root Vercel deployment specification
└── README.md                    # Project documentation
```

---

## 8. Database Overview

The PostgreSQL database contains 26 structured tables enforcing referential integrity and user tenancy:

| Table Category | Key Tables | Purpose |
|---|---|---|
| **Identity & Access** | `users`, `password_reset_tokens` | Authentication, roles, password hashes, and profiles |
| **Personal Ledger** | `incomes`, `expenses`, `categories` | Daily financial cash flows linked to categories |
| **Budgeting & Goals** | `budgets`, `monthly_budget_plans`, `financial_goals`, `goal_contributions` | Envelope budgeting and savings milestones |
| **Balance Sheet** | `financial_holdings`, `liabilities`, `liability_payments` | Asset cushions and amortized loan obligations |
| **Project Workspaces** | `project_workspaces`, `project_categories`, `project_expenses` | Completely segregated project accounting |
| **Banking & Reconciliation** | `bank_import_batches`, `bank_transactions` | Statement imports, match statuses, deduplication |
| **Intelligence & Audit** | `ai_insights`, `financial_documents`, `notifications`, `reminder_delivery_logs` | Anomaly dismissals, OCR logs, user alerts |

---

## 9. Machine Learning & AI Implementation

FinMan features two distinct machine learning pipelines alongside multimodal LLM integration:

### 1. Future Expense Predictor (`finman_expense_regressor.pkl`)
- **Algorithm**: `RandomForestRegressor` with time-series historical lag features.
- **Feature Vector (17 features)**:
  - Rolling expenditure: `previous_expense_1`, `previous_expense_2`, `previous_expense_3`, `rolling_expense_mean_3`, `rolling_expense_std_3`.
  - Velocity & Cash Flow: `expense_total`, `expense_count`, `expense_average`, `income_total`, `income_count`, `previous_income_1`, `expense_income_ratio`.
  - Seasonal Cycles: `month_number`, `quarter`, `month_sin`, `month_cos`.
  - Balance Cushion: `savings_current`.
- **Cold-Start Tiers**:
  - *0 Months*: 50/30/20 standard budget allocation baseline (`INSUFFICIENT_DATA`).
  - *1–2 Months*: Seasonally adjusted historical monthly average (`BASELINE_ESTIMATE`).
  - *$\ge 3$ Months*: Live Random Forest multi-tree regression (`SUFFICIENT_HISTORY`).

### 2. Spending Anomaly Detection
- **Statistical Engine**: Dynamic dispersion calculation per expense category.
- **Formula**:
  $$Z = \frac{\text{Amount} - \mu_{\text{category}}}{\max(\sigma_{\text{category}}, 200.0)}$$
- **Flagging Rule**:
  $$Z \ge 2.0 \lor (\text{Amount} \ge 2.5 \times \text{Median}_{\text{category}} \land \text{Amount} \ge ₹1,500)$$
- **Guardrail**: All transactions under ₹800 are bypassed to eliminate false positives on trivial items.
- **Persistence**: User dismissals are permanently stored in `ai_insights` to prevent re-flagging.

### 3. Conversational Financial Advisor & Guardrails
- Powered by Google Gemini (`gemini-flash-lite-latest`).
- **Domain Guardrails**: Strict intent classification enforcing finance-only conversations (budgeting, investments, tax concepts, savings). Off-topic prompts and prompt-injection attempts are safely intercepted.

---

## 10. Optical Character Recognition (OCR)

FinMan uses a redundant two-tier OCR architecture:
1. **Primary Engine**: Google Gemini Multimodal Vision API directly parsing receipt images and PDFs into structured JSON (merchant, date, currency, line items, taxes, total).
2. **Fallback Engine**: Local Tesseract 5 engine running inside the Docker container with image binarization and regex-based numeric extraction.

---

## 11. Installation Instructions

### Prerequisites
- Node.js (v18.0.0 or higher) and npm (v9.0.0 or higher)
- Python (v3.10 or higher) with `pip`
- Git
- Tesseract OCR (v5.x, for local OCR testing)

### Clone the Repository
```bash
git clone https://github.com/vishalini1786/AI-Finance-Assistant.git
cd AI-Finance-Assistant
```

### Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install ML service dependencies
cd ml-service
pip install -r requirements.txt

# Install frontend dependencies
cd ../../frontend
npm install
```

---

## 12. Local Development Instructions

### Step 1: Configure Environment Variables
Copy `.env.example` files to `.env` in both `backend` and `frontend`:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Step 2: Start the Python ML Microservice
```bash
cd backend/ml-service
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

### Step 3: Start the Express Backend API
```bash
cd backend
npm run dev
# Server listens on http://localhost:5000
```

### Step 4: Start the React Frontend
```bash
cd frontend
npm run dev
# Frontend listens on http://localhost:5173
```

---

## 13. Environment Variable Configuration

### Frontend (`frontend/.env`)
| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Express backend API endpoint | `http://localhost:5000/api` |

### Backend API (`backend/.env`)
| Variable | Description | Required | Example |
|---|---|:---:|---|
| `PORT` | Local server port | Yes | `5000` |
| `NODE_ENV` | Environment mode | Yes | `development` / `production` |
| `DB_HOST` | Supabase PostgreSQL host | Yes | `aws-0-ap-northeast-1.pooler.supabase.com` |
| `DB_PORT` | PostgreSQL port | Yes | `5432` |
| `DB_NAME` | Database name | Yes | `postgres` |
| `DB_USER` | Database username | Yes | `postgres.your_project_id` |
| `DB_PASSWORD` | Database password | Yes | `your_secure_password` |
| `DB_SSL` | Enable SSL encryption | Yes | `true` |
| `JWT_SECRET` | Secret key for signing JWTs | Yes | `your_random_jwt_secret_key` |
| `JWT_EXPIRES_IN` | Token expiration time | No | `7d` |
| `FRONTEND_URL` | Allowed CORS origins (comma-separated) | Yes | `https://your-app.vercel.app` |
| `AI_SERVICE_URL` | FastAPI ML Microservice URL | Yes | `http://localhost:8000` or Render URL |
| `GEMINI_API_KEY` | Google Gemini API key | Yes | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini model variant | No | `gemini-flash-lite-latest` |

### Python ML Service (`backend/ml-service/.env`)
| Variable | Description | Default |
|---|---|---|
| `PORT` | Listening port for FastAPI | `8000` |
| `TESSERACT_CMD` | Binary path to Tesseract (Windows only) | System default |

---

## 14. Deployment Architecture

### 1. Frontend on Vercel
- **Root Directory**: `frontend` (or repository root with root `vercel.json`).
- **Framework Preset**: Vite.
- **Build Command**: `npm run build` (generates static bundle in `dist/`).
- **SPA Routing**: Catch-all rewrite routes all requests to `index.html`.

### 2. Express Backend on Render
- **Environment**: Node.js.
- **Root Directory**: `backend`.
- **Build Command**: `npm install`.
- **Start Command**: `npm start`.
- **Health Check Path**: `/api/health`.

### 3. Python ML Microservice on Render
- **Environment**: Docker.
- **Docker Context**: `backend/ml-service`.
- **Dockerfile Path**: `backend/ml-service/Dockerfile`.
- **Health Check Path**: `/health`.

---

## 15. API Overview

| Route Group | Method & Path | Description | Auth Required |
|---|---|---|:---:|
| **Health** | `GET /api/health` | Backend & database connectivity status | No |
| **Auth** | `POST /api/auth/register` | Create user account | No |
| | `POST /api/auth/login` | Authenticate user & return JWT | No |
| **Dashboard** | `GET /api/dashboard/summary` | Cash flow metrics & financial health | Yes |
| | `GET /api/dashboard/ml/forecast` | Next-month expenditure prediction | Yes |
| | `GET /api/dashboard/ml/anomalies` | Detected spending anomalies | Yes |
| | `POST /api/dashboard/ml/anomalies/:id/dismiss` | Dismiss an anomaly alert | Yes |
| **Expenses** | `GET /api/expenses` | List personal expenses with filters | Yes |
| | `POST /api/expenses` | Record a new expense | Yes |
| **Banking** | `POST /api/bank-transactions/upload` | Upload & parse bank statement | Yes |
| | `GET /api/bank-transactions` | List parsed bank transactions | Yes |
| | `POST /api/bank-transactions/:id/match` | Reconcile bank transaction to expense | Yes |
| **ML Microservice** | `GET /health` | ML service & model loading status | No |
| | `POST /predict/expenses` | Random Forest expense regression | No |
| | `POST /detect/anomalies` | Statistical dispersion analysis | No |

---

## 16. Testing Instructions

### Run Backend Unit & Integration Tests
```bash
cd backend
npm test
```

### Run Frontend Production Build Check
```bash
cd frontend
npm run build
```

### Validate ML Model Ingestion Locally
```bash
python -c "import pickle; pickle.load(open('backend/ml-service/models/finman_expense_regressor.pkl', 'rb')); print('Model OK')"
```

---

## 17. Security Considerations

- **Strict User Tenancy**: Every SQL query joins or filters on the authenticated user's ID (`WHERE user_id = $1`). Users cannot read or modify another user's financial ledger.
- **Token-Based Authentication**: Stateless JWTs verified on every protected Express route with automatic bearer extraction.
- **CORS Protection**: Restricted to explicit production frontend origins and verified local development domains.
- **Data Isolation**: Project workspace transactions reside in separate tables from personal accounting.
- **Secure Secret Handling**: No API keys, database credentials, or JWT secrets are hardcoded in client bundles or public repository files.

---

## 18. Limitations

- **Render Cold Starts**: On Render's free tier, backend and ML web services spin down after 15 minutes of inactivity. The initial request may incur a 30–50 second delay while services boot up.
- **OCR Quality**: Handwritten receipts or receipts with severe physical creases/glare may fail extraction and default to manual entry.
- **Historical Data Dependency**: Machine Learning forecasting requires at least 3 active historical months for regression inference; accounts with less history operate on statistical average fallbacks.

---

## 19. Future Enhancements

- Direct Open Banking API integration (Account Aggregator ecosystem in India).
- Multi-currency conversion with real-time foreign exchange feeds.
- Automated tax deduction estimation under both Old and New Tax Regimes.
- Native mobile application using React Native.

---

## 20. License & Credits

Developed as part of the FinMan AI Personal Finance Assistant project.
Author: Vishalini R.
Repository: [vishalini1786/AI-Finance-Assistant](https://github.com/vishalini1786/AI-Finance-Assistant)
