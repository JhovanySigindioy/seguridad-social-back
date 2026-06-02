import bcryptjs from 'bcryptjs';
import db from '../config/database.js';

async function updateUsers() {
  try {
    // 1. Update the new admin user (admin2@agencia.com)
    const adminPasswordHash = await bcryptjs.hash('angelicaravelo', 10);
    await db.query(
      `UPDATE users SET name = 'Angelica Ravelo', email = 'angelica@admin.com', password = ? WHERE email = 'admin2@agencia.com'`,
      [adminPasswordHash]
    );
    console.log('Admin user updated successfully to Angelica Ravelo / angelica@admin.com');

    // 2. Update the office manager user (angelica@construvida.com)
    await db.query(
      `UPDATE users SET name = 'Erika Erika' WHERE email = 'angelica@construvida.com'`
    );
    console.log('Office manager user name updated successfully to Erika Erika');

  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

updateUsers();
