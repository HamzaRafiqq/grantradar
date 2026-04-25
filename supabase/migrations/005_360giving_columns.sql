-- Run in Supabase SQL Editor before importing 360Giving data

ALTER TABLE grants
  ADD COLUMN IF NOT EXISTS source       text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS public_title text,
  ADD COLUMN IF NOT EXISTS public_description text,
  ADD COLUMN IF NOT EXISTS funder_type  text;

-- Index for fast source filtering
CREATE INDEX IF NOT EXISTS grants_source_idx ON grants (source);

-- Back-fill existing rows as manual source
UPDATE grants SET source = 'manual' WHERE source IS NULL;
