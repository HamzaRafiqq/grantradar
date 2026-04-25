-- Upgrade grant_matches to full application tracker
ALTER TABLE grant_matches
  ADD COLUMN IF NOT EXISTS amount_requested integer,
  ADD COLUMN IF NOT EXISTS activity_log     jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deadline_set     date;

-- Index for deadline reminder cron
CREATE INDEX IF NOT EXISTS grant_matches_status_idx ON grant_matches (status);
