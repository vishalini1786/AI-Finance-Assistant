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

const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// ---- Global middleware ----

// Allow the React dev server to call this API during development.
// In production, replace '*' with the real frontend origin.
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple health check - useful for confirming the server is up
// before wiring up the frontend.
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'FinMan API is running', data: {} });
});

// ---- Phase 1 routes ----
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/monthly-plans', monthlyPlanRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/holdings', holdingRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

// ---- 404 + centralized error handling (must be last) ----
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
