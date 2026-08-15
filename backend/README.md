# FinMan Backend (Node.js + Express)

Phase 1 backend for the FinMan personal finance app: PostgreSQL,
authentication, and the core Income / Expense / Budget / Dashboard APIs.

## Architecture

```
React (frontend) → Axios → Express (this folder) → PostgreSQL
```

```
Routes → Controllers → Services → Repositories → PostgreSQL
```

- **Routes** — define endpoints and attach middleware
- **Controllers** — parse HTTP requests, call services, format responses
- **Services** — business logic (ownership checks, calculations)
- **Repositories** — raw parameterized SQL, nothing else
- **Middleware** — auth, validation, centralized error handling

## Installation

```bash
cd backend
npm install
```

## Environment variables

Copy the example file and fill in your local values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Port the Express server listens on (default `5000`) |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | Long random string used to sign JWTs — never commit a real one |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `AI_SERVICE_URL` | Reserved for the future FastAPI microservice (unused in Phase 1) |

## Database setup

See [`../database/README.md`](../database/README.md) for full instructions.
Short version:

```bash
createdb finman_db
psql -d finman_db -f ../database/schema/01_extensions.sql
psql -d finman_db -f ../database/schema/02_create_tables.sql
psql -d finman_db -f ../database/schema/03_constraints.sql
psql -d finman_db -f ../database/schema/04_indexes.sql
psql -d finman_db -f ../database/seed/01_categories.sql
psql -d finman_db -f ../database/seed/02_demo_data.sql   # optional
```

## Running the backend

```bash
npm run dev     # nodemon, auto-restarts on file changes
# or
npm start       # plain node
```

The server starts at `http://localhost:5000` (or whatever `PORT` you set).
Confirm it's up:

```bash
curl http://localhost:5000/api/health
```

## Authentication flow

1. `POST /api/auth/register` — creates a user (bcrypt-hashed password), returns a JWT.
2. `POST /api/auth/login` — verifies credentials, returns a JWT.
3. Every private request sends `Authorization: Bearer <token>`.
4. `authMiddleware` verifies the token and sets `req.userId`.
5. Every repository query filters by `user_id`, so a user can only
   ever see or modify their own data — even if a malicious client
   tries to pass a different `userId` in the request body.

## API endpoints (Phase 1)

### Auth
| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Private |

### User
| Method | Path | Auth |
|---|---|---|
| GET | `/api/users/profile` | Private |
| PUT | `/api/users/profile` | Private |

### Categories
| Method | Path | Auth |
|---|---|---|
| GET | `/api/categories` | Private |

### Income
| Method | Path | Auth |
|---|---|---|
| POST | `/api/income` | Private |
| GET | `/api/income` | Private |
| GET | `/api/income/:id` | Private |
| PUT | `/api/income/:id` | Private |
| DELETE | `/api/income/:id` | Private |

### Expenses
| Method | Path | Auth |
|---|---|---|
| POST | `/api/expenses` | Private |
| GET | `/api/expenses` | Private |
| GET | `/api/expenses/:id` | Private |
| PUT | `/api/expenses/:id` | Private |
| DELETE | `/api/expenses/:id` | Private |

### Budgets
| Method | Path | Auth |
|---|---|---|
| POST | `/api/budgets` | Private |
| GET | `/api/budgets` | Private |
| GET | `/api/budgets/:id` | Private |
| PUT | `/api/budgets/:id` | Private |
| DELETE | `/api/budgets/:id` | Private |

Each budget returned by `GET /api/budgets` includes calculated fields:
`actual_spent`, `remaining_amount`, `utilization_percent`, `is_exceeded`.

### Dashboard
| Method | Path | Auth |
|---|---|---|
| GET | `/api/dashboard/summary` | Private |
| GET | `/api/dashboard/recent-transactions` | Private |
| GET | `/api/dashboard/category-expenses` | Private |
| GET | `/api/dashboard/monthly-trends` | Private |

## Response format

Every response follows the same shape.

Success:
```json
{ "success": true, "message": "Expense created successfully", "data": { } }
```

Error:
```json
{ "success": false, "message": "Unable to create expense", "error": "Validation failed" }
```

## Testing

Point `.env` at a disposable test database, then:

```bash
npm test
```

`tests/` covers: registration, login (valid/invalid), duplicate email,
protected routes with/without a token, full CRUD for income/expenses/
budgets, budget utilization calculation, and cross-user data isolation
(User A cannot read User B's records).

## Folder structure

```
backend/
├── src/
│   ├── config/        # env loader, PostgreSQL pool
│   ├── controllers/    # HTTP request/response handling
│   ├── routes/         # endpoint definitions + middleware wiring
│   ├── services/       # business logic
│   ├── repositories/   # raw SQL, one file per table
│   ├── middleware/      # auth, validation, error handling
│   ├── validators/     # input validation functions
│   ├── utils/           # jwt, password hashing, response shape, logger
│   ├── app.js           # Express app (no server start - testable)
│   └── server.js        # starts the HTTP server
├── tests/
├── uploads/             # reserved for Phase 2 document/OCR uploads
├── .env / .env.example
└── package.json
```

## Not implemented yet (later phases)

Controllers/routes for savings, investments, liabilities, recurring
payments, taxes, financial documents, AI insights, financial goals,
life-event simulations, and notifications are intentionally not built
yet — the database tables exist (per the full ER diagram) but their
APIs come in later steps, along with the FastAPI AI microservice,
OCR, and the Ollama chatbot.
