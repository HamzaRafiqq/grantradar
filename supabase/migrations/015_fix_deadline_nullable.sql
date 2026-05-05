-- Migration 015: Make grants.deadline nullable
-- The deadline NOT NULL constraint was silently blocking all 360Giving imports
-- because historical distribution data doesn't have future deadlines.
-- Open/rolling grants also legitimately have no fixed deadline.

ALTER TABLE grants ALTER COLUMN deadline DROP NOT NULL;

-- Ensure application_url has a unique index for upsert to work correctly
-- (upsert with onConflict requires a unique constraint)
CREATE UNIQUE INDEX IF NOT EXISTS grants_application_url_idx
  ON grants (application_url)
  WHERE application_url IS NOT NULL;
