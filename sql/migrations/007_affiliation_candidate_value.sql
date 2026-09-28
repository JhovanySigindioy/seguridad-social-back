ALTER TABLE affiliations
  ADD COLUMN IF NOT EXISTS proposed_value DECIMAL(12,2) NULL AFTER affiliation_origin;
