require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function run() {
  try {
    const sqlPath = path.resolve(__dirname, '../../database/schema/06_create_projects.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running migration...');
    await db.query(sql);
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
