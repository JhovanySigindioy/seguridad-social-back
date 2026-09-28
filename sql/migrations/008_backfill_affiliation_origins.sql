UPDATE affiliations a
INNER JOIN client_employers ce ON ce.id = a.client_employer_id
INNER JOIN companies co ON co.id = ce.company_id
SET a.affiliation_origin = 'PRIMERA_AFILIACION'
WHERE NOT EXISTS (
  SELECT 1
  FROM affiliations previous_a
  INNER JOIN client_employers previous_ce ON previous_ce.id = previous_a.client_employer_id
  INNER JOIN companies previous_co ON previous_co.id = previous_ce.company_id
  WHERE previous_ce.client_id = ce.client_id
    AND previous_co.agency_id = co.agency_id
    AND (
      previous_a.start_date < a.start_date
      OR (previous_a.start_date = a.start_date AND previous_a.id < a.id)
    )
);

UPDATE affiliations a
INNER JOIN client_employers ce ON ce.id = a.client_employer_id
INNER JOIN companies co ON co.id = ce.company_id
SET a.affiliation_origin = 'REINGRESO'
WHERE EXISTS (
  SELECT 1
  FROM affiliations previous_a
  INNER JOIN client_employers previous_ce ON previous_ce.id = previous_a.client_employer_id
  INNER JOIN companies previous_co ON previous_co.id = previous_ce.company_id
  WHERE previous_ce.client_id = ce.client_id
    AND previous_co.agency_id = co.agency_id
    AND previous_a.status = 'Inactivo'
    AND previous_a.start_date < a.start_date
    AND (previous_a.end_date IS NULL OR previous_a.end_date <= a.start_date)
);
