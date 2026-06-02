import db from '../config/database.js';

async function updateEmail() {
  try {
    await db.query(
      `UPDATE users SET email = 'erika@construvida.com' WHERE email = 'angelica@construvida.com'`
    );
    console.log('Office manager user email updated successfully to erika@construvida.com');
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

updateEmail();
