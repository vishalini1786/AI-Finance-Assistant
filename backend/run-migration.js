const fs = require('fs');
const path = require('path');
const db = require('./src/config/database');

const migrations = [
  '07_monthly_budget_planner.sql',
  '08_quick_expense_and_reminders.sql',
];

async function runMigrations() {
  for (const file of migrations) {
    try {
      const sqlPath = path.join(__dirname, '../database/schema', file);
      if (!fs.existsSync(sqlPath)) {
        console.log(`Skipping ${file} — not found.`);
        continue;
      }
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`Running migration: ${file}`);
      await db.query(sql);
      console.log(`✓ ${file} completed.`);
    } catch (err) {
      console.error(`✗ ${file} failed:`, err.message);
    }
  }
  process.exit(0);
}

runMigrations();
