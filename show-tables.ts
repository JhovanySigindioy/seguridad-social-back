import pool from './src/config/database.js';

pool.query('SHOW TABLES').then(([rows]) => {
  console.log(rows);
  process.exit(0);
}).catch(console.error);
