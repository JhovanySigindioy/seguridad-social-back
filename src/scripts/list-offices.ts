import db from '../config/database.js';

async function listOffices() {
  try {
    const [offices] = await db.query('SELECT * FROM offices;');
    console.log(offices);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

listOffices();
