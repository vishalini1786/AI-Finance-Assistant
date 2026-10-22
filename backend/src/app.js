// app.js
// Configures the Express application: global middleware, route
// mounting, and error handling. Does NOT start the server - that
// happens in server.js so this file can be imported by tests too.

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const monthlyPlanRoutes = require('./routes/monthlyPlanRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const projectRoutes = require('./routes/projectRoutes');
const goalRoutes = require('./routes/goalRoutes');
const holdingRoutes = require('./routes/holdingRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const documentRoutes = require('./routes/documentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');

const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

function normalizeOrigin(value) {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.origin : null;
  } catch {
    return null;
  }
}

const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);
const developmentOrigins = process.env.NODE_ENV === 'production'
  ? []
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173'];
const allowedOrigins = new Set([...configuredOrigins, ...developmentOrigins]);

function isOriginAllowed(origin) {
  if (!origin || allowedOrigins.has(origin)) {
    return true;
  }
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.netlify.app') ||
      host.endsWith('.onrender.com')
    ) {
      return true;
    }
  } catch {}
  return false;
}

// Browser auth uses a Bearer token, not cookies, so credentialed CORS is not
// needed. Production origins come only from FRONTEND_URL and trusted deploy domains.
app.use(cors({
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check verifies both the API process and PostgreSQL.
const path = require('path');
const fs = require('fs');
const db = require('./config/database');

const frontendDist = path.resolve(__dirname, '../../frontend/dist');
const hasFrontendDist = fs.existsSync(frontendDist) && fs.existsSync(path.join(frontendDist, 'index.html'));

if (hasFrontendDist) {
  app.use(express.static(frontendDist));
}

// API Root Index info
const apiIndexHandler = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Finance Assistant API (FinMan) is live and operational',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      categories: '/api/categories',
      income: '/api/income',
      expenses: '/api/expenses',
      budgets: '/api/budgets',
      monthlyPlans: '/api/monthly-plans',
      dashboard: '/api/dashboard',
      projects: '/api/projects',
      goals: '/api/goals',
      holdings: '/api/holdings',
      calendar: '/api/calendar',
      documents: '/api/documents',
      notifications: '/api/notifications',
      reports: '/api/reports',
      admin: '/api/admin',
    },
  });
};

app.get('/api', apiIndexHandler);
if (!hasFrontendDist) {
  app.get('/', apiIndexHandler);
}

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1 AS health_check');

    res.status(200).json({
      success: true,
      message: 'FinMan API and database are connected',
      database: 'connected'
    });
  } catch (error) {
    console.error('Database health check failed:', error.message);

    res.status(503).json({
      success: false,
      message: 'FinMan API is running, but the database is unavailable',
      database: 'disconnected'
    });
  }
});

// ---- Phase 1 & 2 routes ----
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/income', incomeRoutes);
apiRouter.use('/expenses', expenseRoutes);
apiRouter.use('/budgets', budgetRoutes);
apiRouter.use('/monthly-plans', monthlyPlanRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/projects', projectRoutes);
apiRouter.use('/goals', goalRoutes);
apiRouter.use('/holdings', holdingRoutes);
apiRouter.use('/calendar', calendarRoutes);
apiRouter.use('/documents', documentRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/admin', adminRoutes);

// Mount under /api (standard) and directly at root (resilient for base URLs without /api)
app.use('/api', apiRouter);
app.use(apiRouter);

// Client-side single page app fallback (if frontend is built locally or packaged)
if (hasFrontendDist) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    return res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ---- 404 + centralized error handling (must be last) ----
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
