import bcryptjs from 'bcryptjs';
import db from '../config/database.js';

async function createUser() {
  try {
    const passwordHash = await bcryptjs.hash('123456', 10);
    
    // Insert user
    const [result]: any = await db.query(
      `INSERT INTO users (name, email, password, role, agency_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Construvida AyJ Manager', 'manager@construvida.com', passwordHash, 'office_manager', 1, 1]
    );

    const userId = result.insertId;

    // Insert user_office mapping for Construvida AyJ (id 11)
    await db.query(
      `INSERT INTO user_offices (user_id, office_id) VALUES (?, ?)`,
      [userId, 11]
    );

    console.log('User created successfully:', {
      id: userId,
      name: 'Construvida AyJ Manager',
      email: 'manager@construvida.com',
      password: '123456',
      role: 'office_manager',
      office_id: 11
    });

  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

createUser();
