import db from '../config/database.js';

async function listUsers() {
  try {
    const [users] = await db.query('SELECT id, name, email, role, agency_id FROM users;');
    console.log(users);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

listUsers();
