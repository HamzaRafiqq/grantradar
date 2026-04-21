-- Run in Supabase SQL Editor

ALTER TABLE grants
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'United Kingdom',
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS amount_usd integer;

-- Back-fill existing rows as UK grants
UPDATE grants SET country = 'United Kingdom', currency = 'GBP' WHERE country IS NULL;
UPDATE grants SET amount_usd = ROUND(max_award * 1.27) WHERE currency = 'GBP' AND amount_usd IS NULL;
