const { Client } = require('pg');

async function testPassword(password) {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'finman_db',
    user: 'postgres',
    password: password,
  });

  try {
    await client.connect();
    console.log(`Success with password: "${password}"`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`Failed with password: "${password}" - ${err.message}`);
    return false;
  }
}

async function run() {
  const commonPasswords = ['postgres', 'root', 'admin', 'password', '123456', '', 'change_me', 'visha', 'vishalini'];
  for (const pw of commonPasswords) {
    if (await testPassword(pw)) {
      process.exit(0);
    }
  }
  console.log('None of the common passwords worked.');
  process.exit(1);
}

run();
