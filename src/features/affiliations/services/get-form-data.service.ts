import db from '../../../config/database.js';

export class GetFormDataService {
  async execute(agencyId: number) {
    const [clients] = await db.query<any[]>(
      `SELECT 
         c.id,
         c.first_name,
         c.second_name,
         c.first_lastname,
         c.second_lastname,
         c.identification,
         c.email,
         o.name AS office_name
       FROM clients c
         LEFT JOIN offices o ON o.id = c.office_id
       WHERE o.agency_id = ? OR o.agency_id IS NULL
       ORDER BY c.first_name ASC, c.first_lastname ASC`,
      [agencyId]
    );

    const [companies] = await db.query<any[]>(
      `SELECT id, name FROM companies WHERE agency_id = ? AND is_active = 1 ORDER BY name ASC`,
      [agencyId]
    );

    const [eps] = await db.query<any[]>('SELECT id, name FROM eps_list ORDER BY name ASC');
    const [arl] = await db.query<any[]>('SELECT id, name FROM arl_list ORDER BY name ASC');
    const [ccf] = await db.query<any[]>('SELECT id, name FROM ccf_list ORDER BY name ASC');
    const [pensions] = await db.query<any[]>('SELECT id, name FROM pension_fund_list ORDER BY name ASC');

    return { clients, companies, eps, arl, ccf, pensions };
  }
}
