import mysql from 'mysql2/promise';

const DEST = {
  host: '82.197.82.132',
  user: 'u311745467_socialsecurity',
  password: 'HOst123*',
  database: 'u311745467_socialsecurity',
};

const ORIG = {
  host: 'srv1779.hstgr.io',
  user: 'u311745467_construvida',
  password: 'aAJ605R$',
  database: 'u311745467_construvida',
};

type Conn = mysql.Connection;

const log = (msg: string) => console.log(`[${new Date().toISOString()}] ${msg}`);
const divider = () => console.log('\n' + '='.repeat(80) + '\n');

let pingInterval: ReturnType<typeof setInterval> | null = null;

async function connect(db: typeof DEST): Promise<Conn> {
  const conn = await mysql.createConnection({ ...db, connectTimeout: 60000 });
  log(`Conectado a ${db.database} en ${db.host}`);
  return conn;
}

function startPing(conn: Conn) {
  pingInterval = setInterval(async () => {
    try { await conn.execute('SELECT 1'); } catch { /* ignore */ }
  }, 15000);
}

function stopPing() {
  if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
}

async function batchInsert(conn: Conn, table: string, columns: string[], rows: any[][]): Promise<number> {
  if (rows.length === 0) return 0;
  const placeholders = rows.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
  const flat = rows.flat();
  const [result] = await conn.execute(
    `INSERT INTO \`${table}\` (${columns.join(',')}) VALUES ${placeholders}`,
    flat
  );
  return (result as any).affectedRows;
}

function splitName(fullName: string): [string, string] {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || (parts.length === 1 && !parts[0])) return ['', ''];
  const first = parts[0];
  const rest = parts.slice(1).join(' ');
  return [first, rest];
}

function makePlaceholders(count: number): string {
  return Array(count).fill('?').join(',');
}

async function main() {
  let dest!: Conn;
  let orig!: Conn;

  try {
    dest = await connect(DEST);
    orig = await connect(ORIG);

    // ====================================================================
    // FASE 1: TRUNCAR TODO EN DESTINO
    // ====================================================================
    divider();
    log('FASE 1: TRUNCANDO TABLAS EN DESTINO');
    divider();

    const truncateOrder = [
      'monthly_payments',
      'affiliations',
      'client_employers',
      'facturas',
      'clients',
      'user_offices',
      'users',
      'offices',
      'companies',
      'audit_logs',
    ];

    startPing(dest);
    for (const table of truncateOrder) {
      log(`Truncando ${table}...`);
      await dest.execute(`DELETE FROM \`${table}\``);
    }
    stopPing();

    // ====================================================================
    // FASE 2: SEMILLA DE TABLAS DE INFRAESTRUCTURA
    // ====================================================================
    divider();
    log('FASE 2: SEMILLA DE INFRAESTRUCTURA');
    divider();

    await dest.execute('DELETE FROM roles');
    for (const role of ['admin', 'office_manager', 'viewer']) {
      await dest.execute('INSERT IGNORE INTO roles (name) VALUES (?)', [role]);
    }
    log('Roles insertados: admin, office_manager, viewer');

    await dest.execute('DELETE FROM document_types');
    await batchInsert(dest, 'document_types', ['id', 'code', 'name'], [
      [1, 'CC', 'Cédula de Ciudadanía'],
      [2, 'CE', 'Cédula de Extranjería'],
      [3, 'NIT', 'NIT'],
      [4, 'TI', 'Tarjeta de Identidad'],
      [5, 'PPT', 'Permiso por Protección Temporal'],
    ]);
    log('Document types insertados: CC, CE, NIT, TI, PPT');

    await dest.execute('DELETE FROM agencies');
    await dest.execute(
      "INSERT INTO agencies (id, name, nit, logo_url) VALUES (1, 'Construvida Agency', '000.000.000-0', NULL)"
    );
    log('Agency creada: Construvida Agency (ID=1)');

    // ====================================================================
    // FASE 3: CATÁLOGOS (DESDE ORIGEN)
    // ====================================================================
    divider();
    log('FASE 3: CATÁLOGOS DESDE CONSTRUVIDA');
    divider();

    const catTables = [
      { table: 'arl_list', mapName: 'arlMap' },
      { table: 'eps_list', mapName: 'epsMap' },
      { table: 'ccf_list', mapName: 'ccfMap' },
      { table: 'pension_fund_list', mapName: 'pensionMap' },
    ] as const;

    const [catMaps, catSizes] = await (async () => {
      const maps: Record<string, Map<number, number>> = {};
      const sizes: string[] = [];
      for (const cat of catTables) {
        await dest.execute(`DELETE FROM ${cat.table}`);
        const [rows] = await orig.query(`SELECT id, name FROM ${cat.table}`);
        const map = new Map<number, number>();
        const nameRows = (rows as any[]).map(r => [r.name]);
        await batchInsert(dest, cat.table, ['name'], nameRows);
        // Re-read to build map
        const [inserted] = await dest.query(`SELECT id, name FROM ${cat.table}`);
        for (const ins of inserted as any[]) {
          const old = (rows as any[]).find(r => r.name === ins.name);
          if (old) map.set(old.id, ins.id);
        }
        maps[cat.table] = map;
        sizes.push(`${cat.table}: ${map.size} registros`);
      }
      return [maps, sizes] as const;
    })();

    for (const s of catSizes) log(s);

    const arlMap = catMaps['arl_list'];
    const epsMap = catMaps['eps_list'];
    const ccfMap = catMaps['ccf_list'];
    const pensionMap = catMaps['pension_fund_list'];

    // ====================================================================
    // FASE 4: MIGRACIÓN TRANSACCIONAL
    // ====================================================================
    divider();
    log('FASE 4: MIGRACIÓN DE DATOS');
    divider();

    const BATCH = 100;

    // --- COMPANIES ---
    startPing(orig);
    const [companyRows] = await orig.query(
      'SELECT id, name, nit, address, phone, email, is_active FROM companies'
    );
    const companyMap = new Map<number, number>();
    const companyBatch: any[][] = [];
    for (const row of companyRows as any[]) {
      companyBatch.push([1, row.name, row.nit ?? '', row.email ?? null, row.is_active ?? 1]);
    }
    const compCols = ['agency_id', 'name', 'nit', 'email', 'is_active'];
    await batchInsert(dest, 'companies', compCols, companyBatch);
    // Re-read to build map
    const [insertedCompanies] = await dest.query('SELECT id, name, nit FROM companies');
    for (const ins of insertedCompanies as any[]) {
      const old = (companyRows as any[]).find(
        (r: any) => r.name === ins.name && (r.nit ?? '') === ins.nit
      );
      if (old) companyMap.set(old.id, ins.id);
    }
    log(`companies: ${companyMap.size} registros migrados`);
    stopPing();

    // --- OFFICES ---
    const [officeRows] = await orig.query(
      'SELECT id, name, representative_name, logo_url, is_active FROM offices'
    );
    const officeMap = new Map<number, number>();
    const officeBatch: any[][] = [];
    for (const row of officeRows as any[]) {
      officeBatch.push([1, row.name, row.representative_name ?? null, row.is_active ?? 1]);
    }
    const offCols = ['agency_id', 'name', 'address', 'is_active'];
    await batchInsert(dest, 'offices', offCols, officeBatch);
    const [insertedOffices] = await dest.query('SELECT id, name FROM offices');
    for (const ins of insertedOffices as any[]) {
      const old = (officeRows as any[]).find((r: any) => r.name === ins.name);
      if (old) officeMap.set(old.id, ins.id);
    }
    log(`offices: ${officeMap.size} registros migrados`);

    // --- USERS ---
    const [userRows] = await orig.query('SELECT id, name, email, password, role, is_active FROM users');
    const userMap = new Map<number, number>();
    const userBatch: any[][] = [];
    const userOldIds: number[] = [];
    for (const row of userRows as any[]) {
      const email = (row.email ?? '').trim();
      if (!email) continue;
      userBatch.push([row.name, email, row.password, row.role ?? 'office_manager', 1, row.is_active ?? 1]);
      userOldIds.push(row.id);
    }
    const userCols = ['name', 'email', 'password', 'role', 'agency_id', 'is_active'];
    await batchInsert(dest, 'users', userCols, userBatch);
    const [insertedUsers] = await dest.query('SELECT id, email FROM users');
    const insUsers = insertedUsers as any[];
    for (let i = 0; i < userOldIds.length; i++) {
      const inserted = insUsers.find((u: any) => u.email === userBatch[i][1]);
      if (inserted) userMap.set(userOldIds[i], inserted.id);
    }
    log(`users: ${userMap.size} registros migrados`);

    // --- USER OFFICES ---
    const [userOfficeRows] = await orig.query('SELECT user_id, office_id FROM user_offices');
    let userOfficeCount = 0;
    for (const row of userOfficeRows as any[]) {
      const newUserId = userMap.get(row.user_id);
      const newOfficeId = officeMap.get(row.office_id);
      if (!newUserId || !newOfficeId) continue;
      await dest.execute('INSERT IGNORE INTO user_offices (user_id, office_id) VALUES (?, ?)', [
        newUserId,
        newOfficeId,
      ]);
      userOfficeCount++;
    }
    log(`user_offices: ${userOfficeCount} registros migrados`);

    // --- CLIENTS (batch) ---
    startPing(orig);
    const [clientRows] = await orig.query(
      `SELECT c.id, c.full_name, c.identification, c.company_id, c.email, c.address, c.is_active,
              (SELECT cp.phone_number FROM client_phones cp WHERE cp.client_id = c.id LIMIT 1) AS phone_number
       FROM clients c`
    );
    stopPing();

    const clientMap = new Map<number, number>();
    const clientBatch: any[][] = [];
    const clientOldIds: number[] = [];
    const clientCols = [
      'document_type_id', 'first_name', 'second_name', 'first_lastname', 'second_lastname',
      'identification', 'full_name', 'email', 'office_id', 'phone_1', 'phone_2',
    ];

    for (const row of clientRows as any[]) {
      const [firstName, firstLastname] = splitName(row.full_name ?? '');
      const newOfficeId = officeMap.get(row.company_id) ?? officeMap.values().next().value ?? 1;
      clientBatch.push([
        1, firstName, null, firstLastname, null,
        row.identification, row.full_name, row.email ?? null, newOfficeId,
        row.phone_number ?? null, null,
      ]);
      clientOldIds.push(row.id);
    }

    // Insert in batches of BATCH
    let clientIdx = 0;
    while (clientIdx < clientBatch.length) {
      const chunk = clientBatch.slice(clientIdx, clientIdx + BATCH);
      const ids = clientOldIds.slice(clientIdx, clientIdx + BATCH);
      const placeholders = chunk.map(() => `(${clientCols.map(() => '?').join(',')})`).join(',');
      const flat = chunk.flat();
      const [result] = await dest.execute(
        `INSERT INTO clients (${clientCols.join(',')}) VALUES ${placeholders}`,
        flat
      );
      const insertId = (result as any).insertId;
      ids.forEach((oldId, i) => clientMap.set(oldId, insertId + i));
      clientIdx += BATCH;
    }
    log(`clients: ${clientMap.size} registros migrados`);

    // --- CLIENT EMPLOYERS ---
    startPing(orig);
    const [empPairs] = await orig.query(
      `SELECT client_id, company_id, office_id,
              MIN(CONCAT(year, '-', LPAD(month, 2, '0'))) AS start_date
       FROM monthly_affiliations
       GROUP BY client_id, company_id, office_id`
    );
    stopPing();

    const empMap = new Map<string, number>();
    const empBatch: any[][] = [];
    const empKeys: string[] = [];
    for (const row of empPairs as any[]) {
      const newClientId = clientMap.get(row.client_id);
      const newCompanyId = companyMap.get(row.company_id);
      const newOfficeId = officeMap.get(row.office_id);
      if (!newClientId || !newCompanyId || !newOfficeId) continue;
      empBatch.push([newClientId, newCompanyId, newOfficeId, 1, row.start_date ?? null]);
      empKeys.push(`${row.client_id}:${row.company_id}`);
    }
    const empCols = ['client_id', 'company_id', 'office_id', 'is_active', 'start_date'];
    // Insert all
    for (let i = 0; i < empBatch.length; i += BATCH) {
      const chunk = empBatch.slice(i, i + BATCH);
      const keys = empKeys.slice(i, i + BATCH);
      const placeholders = chunk.map(() => `(${empCols.map(() => '?').join(',')})`).join(',');
      const flat = chunk.flat();
      const [result] = await dest.execute(
        `INSERT INTO client_employers (${empCols.join(',')}) VALUES ${placeholders}`,
        flat
      );
      const insertId = (result as any).insertId;
      keys.forEach((k, j) => empMap.set(k, insertId + j));
    }
    log(`client_employers: ${empMap.size} registros migrados`);

    // --- AFFILIATIONS ---
    startPing(orig);
    const [affGroups] = await orig.query(
      `SELECT client_id, company_id, office_id,
              MIN(CONCAT(year, '-', LPAD(month, 2, '0'), '-01')) AS start_date,
              GROUP_CONCAT(DISTINCT eps_id) AS eps_ids,
              GROUP_CONCAT(DISTINCT arl_id) AS arl_ids,
              GROUP_CONCAT(DISTINCT ccf_id) AS ccf_ids,
              GROUP_CONCAT(DISTINCT pension_fund_id) AS pension_ids,
              GROUP_CONCAT(DISTINCT risk) AS risks,
              GROUP_CONCAT(DISTINCT observation SEPARATOR ' | ') AS observations,
              MAX(is_active) AS is_active
       FROM monthly_affiliations
       GROUP BY client_id, company_id, office_id`
    );
    stopPing();

    const affMap = new Map<string, number>();
    const affBatch: any[][] = [];
    const affKeys: string[] = [];
    const defaultUserId = userMap.get(1) ?? 1;
    const affCols = [
      'client_employer_id', 'eps_id', 'arl_id', 'ccf_id', 'pension_id',
      'risk_level', 'start_date', 'status', 'observation', 'created_by',
    ];

    for (const row of affGroups as any[]) {
      const empKey = `${row.client_id}:${row.company_id}`;
      const newEmpId = empMap.get(empKey);
      if (!newEmpId) continue;

      const newEpsId = row.eps_ids ? epsMap.get(Number(String(row.eps_ids).split(',')[0])) : null;
      const newArlId = row.arl_ids ? arlMap.get(Number(String(row.arl_ids).split(',')[0])) : null;
      const newCcfId = row.ccf_ids ? ccfMap.get(Number(String(row.ccf_ids).split(',')[0])) : null;
      const newPensionId = row.pension_ids ? pensionMap.get(Number(String(row.pension_ids).split(',')[0])) : null;
      const riskLevel = String(row.risks ?? '').split(',').filter(Boolean)[0] ?? null;
      const startDate = row.start_date ? String(row.start_date).substring(0, 10) : null;
      const status = row.is_active ? 'Activo' : 'Inactivo';

      affBatch.push([
        newEmpId, newEpsId, newArlId, newCcfId, newPensionId,
        riskLevel, startDate, status, row.observations ?? null, defaultUserId,
      ]);
      affKeys.push(empKey);
    }

    for (let i = 0; i < affBatch.length; i += BATCH) {
      const chunk = affBatch.slice(i, i + BATCH);
      const keys = affKeys.slice(i, i + BATCH);
      const placeholders = chunk.map(() => `(${affCols.map(() => '?').join(',')})`).join(',');
      const flat = chunk.flat();
      const [result] = await dest.execute(
        `INSERT INTO affiliations (${affCols.join(',')}) VALUES ${placeholders}`,
        flat
      );
      const insertId = (result as any).insertId;
      keys.forEach((k, j) => affMap.set(k, insertId + j));
    }
    log(`affiliations: ${affMap.size} registros migrados`);

    // --- MONTHLY PAYMENTS ---
    startPing(orig);
    const [monthlyRows] = await orig.query(
      `SELECT ma.client_id, ma.company_id, ma.month, ma.year, ma.value, ma.paid_status,
              ma.gov_record_completed_at, ma.is_auto_renewed, ma.user_id,
              ma.risk, ma.observation,
              pm.name AS payment_method_name
       FROM monthly_affiliations ma
       LEFT JOIN payment_methods pm ON pm.id = ma.payment_method_id`
    );
    stopPing();

    const paymentMethodMap: Record<string, string> = {
      'Efectivo': 'Efectivo',
      'Transferencia Bancaria': 'Transferencia',
      'Tarjeta de Crédito': 'Otro',
      'Nequi': 'Nequi',
      'Daviplata': 'Daviplata',
    };
    const statusMap: Record<string, string> = {
      'Pendiente': 'Pendiente',
      'Pagado': 'Pagado',
      'En Proceso': 'En Proceso',
    };
    const pmtCols = [
      'affiliation_id', 'month', 'year', 'value', 'payment_status',
      'payment_method', 'gov_record_at', 'is_auto_renewed', 'created_by',
    ];
    const pmtBatch: any[][] = [];
    let monthlyCount = 0;

    for (const row of monthlyRows as any[]) {
      const empKey = `${row.client_id}:${row.company_id}`;
      const newAffId = affMap.get(empKey);
      if (!newAffId) continue;

      const newUserId = userMap.get(row.user_id) ?? defaultUserId;
      const pm = paymentMethodMap[row.payment_method_name] ?? null;
      const ps = statusMap[row.paid_status] ?? 'Pendiente';

      pmtBatch.push([
        newAffId, row.month, row.year, row.value, ps,
        pm, row.gov_record_completed_at ?? null, row.is_auto_renewed ?? 0, newUserId,
      ]);
      monthlyCount++;
    }

    for (let i = 0; i < pmtBatch.length; i += BATCH) {
      const chunk = pmtBatch.slice(i, i + BATCH);
      const placeholders = chunk.map(() => `(${pmtCols.map(() => '?').join(',')})`).join(',');
      const flat = chunk.flat();
      await dest.execute(
        `INSERT IGNORE INTO monthly_payments (${pmtCols.join(',')}) VALUES ${placeholders}`,
        flat
      );
    }
    log(`monthly_payments: ${monthlyCount} registros migrados`);

    // --- FACTURAS ---
    const [facturaRows] = await orig.query(
      `SELECT f.numero_factura, f.fecha_emision, f.valor_total, f.invoice_status, f.pdf_path
       FROM facturas f`
    );
    const factCols = ['agency_id', 'numero_factura', 'fecha_emision', 'valor_total', 'status', 'pdf_path'];
    const factBatch: any[][] = [];
    for (const row of facturaRows as any[]) {
      const st = ['emitida', 'pagada', 'anulada'].includes(row.invoice_status)
        ? row.invoice_status
        : 'emitida';
      factBatch.push([1, row.numero_factura, row.fecha_emision, row.valor_total, st, row.pdf_path ?? null]);
    }
    await batchInsert(dest, 'facturas', factCols, factBatch);
    log(`facturas: ${factBatch.length} registros migrados`);

    // ====================================================================
    // RESUMEN
    // ====================================================================
    divider();
    log('✅ MIGRACIÓN COMPLETADA');
    divider();

    const summary = [
      ['arl_list', arlMap.size],
      ['eps_list', epsMap.size],
      ['ccf_list', ccfMap.size],
      ['pension_fund_list', pensionMap.size],
      ['companies', companyMap.size],
      ['offices', officeMap.size],
      ['users', userMap.size],
      ['user_offices', userOfficeCount],
      ['clients', clientMap.size],
      ['client_employers', empMap.size],
      ['affiliations', affMap.size],
      ['monthly_payments', monthlyCount],
      ['facturas', factBatch.length],
    ];
    console.table(summary);
  } catch (err) {
    console.error('❌ Error durante la migración:', err);
    process.exit(1);
  } finally {
    if (dest) await dest.end();
    if (orig) await orig.end();
    log('Conexiones cerradas');
  }
}

main();
