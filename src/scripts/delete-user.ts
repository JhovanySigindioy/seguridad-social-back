import db from '../config/database.js';

async function deleteUser() {
  try {
    const [users]: any = await db.query(
      `SELECT id FROM users WHERE email = 'manager@construvida.com'`
    );
    
    if (users.length > 0) {
      const userId = users[0].id;
      await db.query(`DELETE FROM user_offices WHERE user_id = ?`, [userId]);
      await db.query(`DELETE FROM users WHERE id = ?`, [userId]);
      console.log('User Erika (manager@construvida.com) deleted successfully');
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

deleteUser();
