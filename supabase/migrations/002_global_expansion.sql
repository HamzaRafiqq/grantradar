-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'United Kingdom',
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS nonprofit_type text;

-- Back-fill existing rows
UPDATE organisations SET country = 'United Kingdom' WHERE country IS NULL;
UPDATE organisations SET currency = 'GBP' WHERE currency IS NULL;
