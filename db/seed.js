'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database');

async function seed() {
  const hash = await bcrypt.hash('admin123', 12);
  await db.run('INSERT OR IGNORE INTO admins (username, password_hash) VALUES (?,?)', ['admin', hash]);
  console.log('✓ Seed complete. Admin login: admin / admin123');
  process.exit(0);
}
setTimeout(seed, 500); // wait for DB schema to initialise
