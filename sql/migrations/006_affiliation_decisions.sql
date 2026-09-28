ALTER TABLE affiliations
  ADD COLUMN IF NOT EXISTS decision_status ENUM('Por Confirmar', 'Confirmada', 'No Continúa')
    NOT NULL DEFAULT 'Confirmada' AFTER status,
  ADD COLUMN IF NOT EXISTS affiliation_origin ENUM('PRIMERA_AFILIACION', 'CONTINUIDAD', 'REINGRESO')
    NOT NULL DEFAULT 'CONTINUIDAD' AFTER decision_status,
  ADD INDEX IF NOT EXISTS idx_affiliations_decision_status (decision_status),
  ADD INDEX IF NOT EXISTS idx_affiliations_origin (affiliation_origin);

CREATE TABLE IF NOT EXISTS client_employer_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_employer_id BIGINT UNSIGNED NOT NULL,
  status ENUM('Activo', 'Retirado') NOT NULL,
  effective_date DATE NOT NULL,
  reason VARCHAR(100) NULL,
  observations TEXT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_status_history_relation_date (client_employer_id, effective_date),
  CONSTRAINT fk_status_history_client_employer
    FOREIGN KEY (client_employer_id) REFERENCES client_employers(id),
  CONSTRAINT fk_status_history_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
