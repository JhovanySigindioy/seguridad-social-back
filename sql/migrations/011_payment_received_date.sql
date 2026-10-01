ALTER TABLE monthly_payments
  ADD COLUMN IF NOT EXISTS received_date DATE NULL AFTER created_at;
