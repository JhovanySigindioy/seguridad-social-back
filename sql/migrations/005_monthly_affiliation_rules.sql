ALTER TABLE affiliations
  MODIFY COLUMN status ENUM('Activo', 'Inactivo', 'Vencido') NOT NULL DEFAULT 'Activo';

UPDATE affiliations
SET status = 'Vencido'
WHERE status = 'Activo'
  AND end_date IS NOT NULL
  AND end_date < CURRENT_DATE;

ALTER TABLE monthly_payments
  ADD UNIQUE INDEX IF NOT EXISTS uk_payment_period (affiliation_id, month, year);
