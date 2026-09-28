import { readdir, readFile } from 'fs/promises';
import { resolve } from 'path';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const migrationsDir = resolve(process.cwd(), 'sql', 'migrations');

const main = async () => {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (version)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [appliedRows] = await connection.query('SELECT version FROM schema_migrations');
    const applied = new Set((appliedRows as Array<{ version: string }>).map((row) => row.version));
    const files = (await readdir(migrationsDir))
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`Omitida ${file}: ya aplicada`);
        continue;
      }

      console.log(`Aplicando ${file}...`);
      const sql = await readFile(resolve(migrationsDir, file), 'utf8');
      await connection.query(sql);
      await connection.execute('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
      console.log(`Aplicada ${file}`);
    }

    console.log('Migraciones completadas. No se ejecutó ninguna sincronización destructiva de datos.');
  } finally {
    await connection.end();
  }
};

main().catch((error) => {
  console.error('Error ejecutando migraciones:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
