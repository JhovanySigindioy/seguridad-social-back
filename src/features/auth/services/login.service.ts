import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../../config/database.js';
import logger from '../../../shared/utils/logger.js';
import { env } from '../../../config/env.js';
import type { LoginResponse } from '../types/auth.types.js';

const ADMIN_ROLE = 'admin';

export class LoginService {
  async execute(email: string, password: string): Promise<LoginResponse | null> {
    const [users]: any = await pool.query(
      'SELECT id, name, email, password, role, agency_id FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    logger.info('Login attempt', { email, found: users.length > 0 });

    if (users.length === 0) return null;

    const user = users[0];
    const isPasswordValid = await bcryptjs.compare(password, user.password);

    logger.info('Password validation', { email, isValid: isPasswordValid });

    if (!isPasswordValid) return null;

    let officeIds: number[] = [];

    if (user.role === ADMIN_ROLE) {
      const [allOffices]: any = await pool.query(
        'SELECT id FROM offices WHERE agency_id = ? AND is_active = 1',
        [user.agency_id]
      );
      officeIds = allOffices.map((o: any) => o.id);
    } else {
      const [offices]: any = await pool.query(
        'SELECT office_id FROM user_offices WHERE user_id = ?',
        [user.id]
      );
      officeIds = offices.map((o: any) => o.office_id);
    }

    logger.info('Offices resolved', { email, role: user.role, officeCount: officeIds.length });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, agency_id: user.agency_id },
      env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        agency_id: user.agency_id,
      },
      offices: officeIds,
    };
  }
}
