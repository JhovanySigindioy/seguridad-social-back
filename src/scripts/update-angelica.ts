import db from '../config/database.js';

async function updateAngelicaRole() {
  try {
    const [users]: any = await db.query(
      `SELECT id FROM users WHERE email = 'angelica@construvida.com'`
    );
    
    if (users.length > 0) {
      const userId = users[0].id;
      
      // Update role
      await db.query(`UPDATE users SET role = 'office_manager' WHERE id = ?`, [userId]);
      
      // Since she is now an office_manager, she needs explicit office access
      // Assign her to Construvida AyJ (id 11)
      await db.query(`INSERT IGNORE INTO user_offices (user_id, office_id) VALUES (?, ?)`, [userId, 11]);

      console.log('Role updated to office_manager for angelica@construvida.com');
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

updateAngelicaRole();
