import pool from './src/config/database.js';

pool.query(`
  SELECT u.id, u.name, u.email, u.role, o.name as office_name, u.password
  FROM users u
  LEFT JOIN user_offices uo ON uo.user_id = u.id
  LEFT JOIN offices o ON o.id = uo.office_id
`).then(([rows]) => {
  console.log(rows);
  process.exit(0);
}).catch(console.error);
