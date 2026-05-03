import db from '../../../config/database.js';

export const getFormDataService = async (agencyId: number) => {
  const [eps] = await db.query('SELECT id, name FROM eps_list');
  const [arl] = await db.query('SELECT id, name FROM arl_list');
  const [ccf] = await db.query('SELECT id, name FROM ccf_list');
  const [pensions] = await db.query('SELECT id, name FROM pension_fund_list');
  
  // Clientes activos de la agencia con sus empresas vinculadas
  const [clientEmployers] = await db.query(`
    SELECT 
      ce.id as client_employer_id,
      c.identification,
      c.full_name as client_name,
      co.name as company_name
    FROM client_employers ce
    INNER JOIN clients c ON ce.client_id = c.id
    INNER JOIN companies co ON ce.company_id = co.id
    WHERE ce.is_active = 1 AND co.agency_id = ?
  `, [agencyId]);

  return { eps, arl, ccf, pensions, clientEmployers };
};
