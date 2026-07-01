START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS july_2026_candidates;

CREATE TEMPORARY TABLE july_2026_candidates AS
SELECT
  a.id AS source_affiliation_id,
  a.client_employer_id,
  a.eps_id,
  a.arl_id,
  a.ccf_id,
  a.pension_id,
  a.risk_level,
  a.observation,
  a.created_by AS affiliation_created_by,
  mp.id AS source_payment_id,
  mp.value,
  mp.payment_method,
  mp.is_auto_renewed,
  mp.created_by AS payment_created_by
FROM affiliations a
INNER JOIN monthly_payments mp
  ON mp.affiliation_id = a.id
 AND mp.month = 6
 AND mp.year = 2026
LEFT JOIN affiliations july
  ON july.client_employer_id = a.client_employer_id
 AND july.start_date = '2026-07-01'
WHERE a.start_date >= '2026-06-01'
  AND a.start_date < '2026-07-01'
  AND a.status = 'Activo'
  AND a.withdrawal_reason IS NULL
  AND a.withdrawal_observations IS NULL
  AND july.id IS NULL;

SELECT COUNT(*) AS elegibles_para_julio
FROM july_2026_candidates;

SELECT
  c.source_affiliation_id,
  ce.client_id,
  ce.company_id,
  cl.identification,
  CONCAT_WS(' ', cl.first_name, cl.second_name, cl.first_lastname, cl.second_lastname) AS client_name,
  co.name AS company_name,
  o.name AS office_name,
  c.value,
  c.payment_method,
  c.affiliation_created_by,
  c.payment_created_by
FROM july_2026_candidates c
INNER JOIN client_employers ce ON ce.id = c.client_employer_id
INNER JOIN clients cl ON cl.id = ce.client_id
INNER JOIN companies co ON co.id = ce.company_id
INNER JOIN offices o ON o.id = ce.office_id
ORDER BY c.source_affiliation_id DESC
LIMIT 20;

INSERT INTO affiliations (
  client_employer_id,
  start_date,
  end_date,
  status,
  days_worked,
  eps_id,
  arl_id,
  ccf_id,
  pension_id,
  risk_level,
  created_by,
  observation
)
SELECT
  c.client_employer_id,
  '2026-07-01',
  '2026-07-31',
  'Activo',
  31,
  c.eps_id,
  c.arl_id,
  c.ccf_id,
  c.pension_id,
  c.risk_level,
  c.affiliation_created_by,
  c.observation
FROM july_2026_candidates c;

INSERT INTO monthly_payments (
  affiliation_id,
  month,
  year,
  value,
  payment_status,
  payment_method,
  is_auto_renewed,
  created_by
)
SELECT
  july.id,
  7,
  2026,
  c.value,
  'Pendiente',
  c.payment_method,
  c.is_auto_renewed,
  c.payment_created_by
FROM july_2026_candidates c
INNER JOIN affiliations july
  ON july.client_employer_id = c.client_employer_id
 AND july.start_date = '2026-07-01'
LEFT JOIN monthly_payments mpj
  ON mpj.affiliation_id = july.id
 AND mpj.month = 7
 AND mpj.year = 2026
WHERE mpj.id IS NULL;

SELECT COUNT(*) AS afiliaciones_julio_total
FROM affiliations
WHERE start_date = '2026-07-01';

SELECT COUNT(*) AS pagos_julio_total
FROM monthly_payments
WHERE month = 7
  AND year = 2026;

SELECT
  a.id,
  a.client_employer_id,
  a.start_date,
  a.end_date,
  a.created_by,
  mp.id AS payment_id,
  mp.payment_status,
  mp.created_by AS payment_created_by
FROM affiliations a
LEFT JOIN monthly_payments mp
  ON mp.affiliation_id = a.id
 AND mp.month = 7
 AND mp.year = 2026
WHERE a.start_date = '2026-07-01'
ORDER BY a.id DESC
LIMIT 20;

COMMIT;
