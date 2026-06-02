import pool from './src/config/database.js';
import bcrypt from 'bcrypt';

async function updatePasswords() {
  const hash = await bcrypt.hash('123456', 10);
  
  await pool.query('UPDATE users SET password = ? WHERE email IN (?, ?)', [
    hash,
    'angelica@admin.com',
    'erika@construvida.com'
  ]);
  
  console.log('Passwords updated successfully');
  process.exit(0);
}

updatePasswords().catch(console.error);
