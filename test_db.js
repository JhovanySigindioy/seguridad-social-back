import pool from './src/config/database.js';

async function test() {
  const [rows] = await pool.query("SELECT COUNT(*) as c FROM affiliations WHERE DATE(created_at) = '2026-06-01'");
  console.log('Affiliations created on 2026-06-01:', rows[0].c);

  const [rows2] = await pool.query("SELECT COUNT(*) as c FROM monthly_payments WHERE DATE(created_at) = '2026-06-01'");
  console.log('Payments created on 2026-06-01:', rows2[0].c);

  process.exit(0);
}
test();
