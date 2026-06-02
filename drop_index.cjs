const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [rows] = await connection.query("SHOW CREATE TABLE affiliations");
    console.log(rows[0]['Create Table']);
    
    const [rows2] = await connection.query("SHOW CREATE TABLE monthly_payments");
    console.log(rows2[0]['Create Table']);
  } catch(e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run().catch(console.error);
