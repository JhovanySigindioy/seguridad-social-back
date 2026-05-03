import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    console.log('Seeding monthly_affiliations...');
    
    // Insert 5 different mock affiliations
    await connection.query(`
      INSERT INTO monthly_affiliations 
      (client_employer_id, month, year, value, payment_status, payment_method, eps_id, arl_id, ccf_id, pension_id, risk_level, is_auto_renewed, created_by) 
      VALUES 
      (1, 5, 2026, 350000, 'Pagado', 'Transferencia', 1, 1, 1, 1, '1', 1, 1),
      (1, 4, 2026, 120000, 'Pagado', 'Efectivo', 2, NULL, NULL, NULL, NULL, 1, 1),
      (2, 5, 2026, 450000, 'En Proceso', NULL, 1, 2, 2, 2, '3', 1, 1),
      (2, 4, 2026, 80000, 'Pendiente', NULL, NULL, 1, NULL, NULL, '2', 1, 1),
      (3, 5, 2026, 500000, 'Pagado', 'Nequi', 3, 3, 3, 3, '5', 1, 1)
    `);

    console.log('Seed completed successfully.');
  } catch (err) {
    console.error('Error seeding:', err);
  } finally {
    await connection.end();
  }
}

seed();
