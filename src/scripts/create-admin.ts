import bcryptjs from 'bcryptjs';
import db from '../config/database.js';

async function createAdminUser() {
  try {
    const passwordHash = await bcryptjs.hash('123456', 10);
    
    const [result]: any = await db.query(
      `INSERT INTO users (name, email, password, role, agency_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Nuevo Administrador', 'admin2@agencia.com', passwordHash, 'admin', 1, 1]
    );

    const userId = result.insertId;

    console.log('Admin user created successfully:', {
      id: userId,
      name: 'Nuevo Administrador',
      email: 'admin2@agencia.com',
      password: '123456',
      role: 'admin'
    });

  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();
