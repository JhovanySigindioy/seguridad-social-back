import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const sql = `
CREATE TABLE affiliations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_employer_id BIGINT UNSIGNED NOT NULL,
  eps_id BIGINT UNSIGNED NULL,
  arl_id BIGINT UNSIGNED NULL,
  ccf_id BIGINT UNSIGNED NULL,
  pension_id BIGINT UNSIGNED NULL,
  risk_level VARCHAR(20) NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  status ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  days_worked INT NULL,
  observation VARCHAR(500) NULL,
  withdrawal_reason VARCHAR(100) NULL,
  withdrawal_observations TEXT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_employer_id) REFERENCES client_employers(id)
);

CREATE TABLE monthly_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  affiliation_id BIGINT UNSIGNED NOT NULL,
  month TINYINT UNSIGNED NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  payment_status ENUM('Pendiente', 'En Proceso', 'Pagado') DEFAULT 'Pendiente',
  payment_method ENUM('Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Otro') NULL,
  gov_record_at TIMESTAMP(6) NULL,
  is_auto_renewed BOOLEAN DEFAULT 0,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (affiliation_id) REFERENCES affiliations(id),
  UNIQUE KEY uk_payment_period (affiliation_id, month, year)
);

INSERT INTO affiliations (id, client_employer_id, eps_id, arl_id, ccf_id, pension_id, risk_level, start_date, end_date, status, days_worked, observation, withdrawal_reason, withdrawal_observations, created_by, created_at, updated_at)
SELECT id, client_employer_id, eps_id, arl_id, ccf_id, pension_id, risk_level, start_date, end_date, status, days_worked, observation, withdrawal_reason, withdrawal_observations, created_by, created_at, updated_at
FROM monthly_affiliations;

INSERT INTO monthly_payments (affiliation_id, month, year, value, payment_status, payment_method, gov_record_at, is_auto_renewed, created_by, created_at, updated_at)
SELECT id, month, year, value, payment_status, payment_method, gov_record_at, is_auto_renewed, created_by, created_at, updated_at
FROM monthly_affiliations;

DROP TABLE monthly_affiliations;
`;
mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
}).then(async (conn) => {
    console.log('Running migration...');
    await conn.query(sql);
    console.log('Migration complete');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map