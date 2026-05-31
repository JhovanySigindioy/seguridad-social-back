import mysql from 'mysql2/promise';

async function main() {
  const oldDb = await mysql.createConnection({
    host: 'srv1779.hstgr.io',
    user: 'u311745467_construvida',
    password: 'aAJ605R$',
    database: 'u311745467_construvida'
  });

  const newDb = await mysql.createConnection({
    host: '82.197.82.132',
    user: 'u311745467_socialsecurity',
    password: 'HOst123*',
    database: 'u311745467_socialsecurity'
  });

  console.log('Fetching old records...');
  const [oldRecords]: any = await oldDb.query(`
    SELECT 
      c.identification as client_ident,
      co.nit as company_nit,
      m.month, 
      m.year, 
      m.created_at, 
      m.date_paid_received, 
      m.gov_record_completed_at 
    FROM monthly_affiliations m
    JOIN clients c ON c.id = m.client_id
    JOIN companies co ON co.id = m.company_id
  `);
  console.log(`Found ${oldRecords.length} old records.`);

  console.log('Fetching new records...');
  const [newRecords]: any = await newDb.query(`
    SELECT 
      mp.id as payment_id,
      c.identification as client_ident,
      co.nit as company_nit,
      mp.month,
      mp.year
    FROM monthly_payments mp
    JOIN affiliations a ON a.id = mp.affiliation_id
    JOIN client_employers ce ON ce.id = a.client_employer_id
    JOIN clients c ON c.id = ce.client_id
    JOIN companies co ON co.id = ce.company_id
  `);
  console.log(`Found ${newRecords.length} new payments.`);

  const newMap = new Map();
  for (const r of newRecords) {
    const ident = String(r.client_ident).trim();
    const nit = String(r.company_nit).trim();
    const key = `${ident}-${nit}-${r.month}-${r.year}`;
    newMap.set(key, r);
  }

  let mpUpdates = 0;

  for (const old of oldRecords) {
    const ident = String(old.client_ident).trim();
    const nit = String(old.company_nit).trim();
    const key = `${ident}-${nit}-${old.month}-${old.year}`;
    const match = newMap.get(key);

    if (match) {
      const receivedDate = old.date_paid_received || old.created_at;
      const govDate = old.gov_record_completed_at;

      await newDb.query(
        'UPDATE monthly_payments SET created_at = ?, gov_record_at = ? WHERE id = ?',
        [receivedDate, govDate, match.payment_id]
      );
      mpUpdates++;
    }
  }

  console.log('Updating affiliations created_at to match the earliest payment...');
  await newDb.query(`
    UPDATE affiliations a
    JOIN (
      SELECT affiliation_id, MIN(created_at) as min_date
      FROM monthly_payments
      GROUP BY affiliation_id
    ) mp ON mp.affiliation_id = a.id
    SET a.created_at = mp.min_date
  `);

  console.log(`Done! Updated ${mpUpdates} monthly payments and synced affiliations.`);
  process.exit(0);
}

main().catch(console.error);
