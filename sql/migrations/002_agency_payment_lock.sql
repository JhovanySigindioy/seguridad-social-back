ALTER TABLE agencies
ADD COLUMN is_blocked_for_payment TINYINT(1) NOT NULL DEFAULT 0;
