import db from '../config/database.js';

async function updateUser() {
  try {
    await db.query(
      `UPDATE users SET name = 'Erika' WHERE email = 'manager@construvida.com'`
    );
    console.log('User name updated to Erika');
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

updateUser();
